// Vaults: listing and opening, reading and writing fields, editing entries, creating, sharing,
// revoking and organisations.
//
// Guide: https://developer.openvireo.com/sdk/guides/vaults-and-sharing/
//
// Running it signs in, lists the vaults and the entries of the first one, and reads a field if you
// pass an ov:// reference. Nothing is written unless you pass --write, which adds an "OpenVireo
// example" entry to the first vault you can write to. The sharing and organisation functions are here
// to read and copy; run() doesn't call them.
//
//     npm run example -- vaults-and-sharing ["ov://Vault/Entry/field"] [--write]

import { type Account, type AccountVault, addEntryToDb, fingerprint, setItemFields, trustedPublicKeys } from "@openvireo/sdk";
import { prompt, signIn } from "./common.ts";

// Listing and opening
export async function listAndOpen(account: Account): Promise<AccountVault | undefined> {
  const vaults = await account.listVaults();
  // [{ id, name, role: "read" | "write" | "manage", orgId, currentKeyVersion, pendingKeyVersion, rotationRequired }]
  for (const v of vaults) console.log(v.name, v.role, v.id);
  if (!vaults[0]) return undefined;

  const vault = await account.openVault(vaults[0].id); // downloads and decrypts it
  console.log(`Entries in ${vault.name} at ${vault.etag}`); // the server version this copy is based on
  for (const e of vault.vault.entries(false)) console.log(" ", e.title); // the core `Vault` handle
  return vault;
}

// Reading and writing fields
export async function readAndWrite(vault: AccountVault, key: string): Promise<void> {
  console.log(vault.read("ov://Team/GitHub/password"));
  console.log(vault.read({ groupPath: ["Apps"], entry: "Stripe", field: "username" }));

  await vault.write("ov://Team/GitHub/password", "new value"); // edits and syncs
  await vault.write("ov://Team/Apps/Stripe/api_key", key, { create: true }); // creates the entry if needed
}

// Editing the database directly
export async function editEntries(vault: AccountVault): Promise<void> {
  addEntryToDb(vault.vault, vault.vault.rootGroupId(), {
    title: "OpenVireo example", username: "app", passwordValue: "s3cret", url: "", notes: "", tags: [],
  });
  setItemFields(vault.vault, { groupPath: [], entry: "OpenVireo example" }, { username: "svc", token: "…" }, { create: true });

  const result = await vault.sync();
  console.log(result.outcome); // "uploaded", "pulled" (only downloaded), "created" or "unchanged"
  console.log(result.conflicts); // entries both sides changed: { uuid, kind, title, fields }
  console.log(result.changes); // what the merge did, entry by entry
}

// Creating vaults
export async function createVaults(account: Account, orgId: string): Promise<void> {
  await account.createVault("Personal");
  await account.createVault("Team Infra", { orgId }); // org owners and admins get manage automatically
}

// Sharing
export async function shareByEmail(account: Account, vaultId: string): Promise<void> {
  const { principal, fingerprint } = await account.share(vaultId, { email: "bob@example.com" }, "write");
  await confirmWithBob(fingerprint); // compare it with what Bob's app shows, out of band

  await account.share(vaultId, { principal }, "read"); // changing the role
}

export async function shareWithVerifiedKeys(account: Account, vaultId: string): Promise<void> {
  const bob = await account.auth.lookupUser("bob@example.com");
  const keys = trustedPublicKeys(bob); // throws invalid_public_keys if the signature doesn't verify
  await confirmWithBob(fingerprint(keys));
  await account.shareWithKeys(vaultId, { principal: bob.principal }, "write", keys);
}

async function confirmWithBob(fingerprint: string): Promise<void> {
  if ((await prompt(`Does Bob's app show ${fingerprint}? [y/N] `)).toLowerCase() !== "y") {
    throw new Error("fingerprint not confirmed");
  }
}

// Revoking and rotating
export async function revokeAndRotate(account: Account, vaultId: string, bobPrincipal: string): Promise<void> {
  await account.revoke(vaultId, [bobPrincipal]); // removes access and rotates the vault key in one step
  await account.rotate(vaultId); // a new key without removing anyone
}

// Organisations
export async function organisations(account: Account, vaultId: string): Promise<void> {
  const org = await account.auth.createOrg("Acme");
  await account.auth.invite(org.id, { email: "carol@example.com", role: "member" });
  // Carol gets an email, and her app calls account.auth.acceptInvitation(invitationToken)

  const { members } = await account.auth.listMembers(org.id);
  const carol = members.find((m) => m.email === "carol@example.com" && m.status === "accepted");
  if (!carol) return;
  await account.confirmMember(org.id, carol, [{ id: vaultId, role: "read" }]); // seals vault keys to her

  await account.setMemberRole(org.id, carol, "admin"); // admins get manage on every org vault
  const { rotated, failed } = await account.removeMember(org.id, carol.user_id); // and rotates her vaults
  console.log("rotated:", rotated, "failed:", failed);
}

export async function run(args: string[]): Promise<void> {
  const account = await signIn();
  try {
    const vault = await listAndOpen(account);
    const ref = args.find((a) => a.startsWith("ov://"));
    if (vault && ref) console.log(ref, "=", vault.read(ref));
    if (args.includes("--write")) {
      const info = (await account.listVaults()).find((v) => v.role !== "read");
      if (info) await editEntries(await account.openVault(info.id));
    }
  } finally {
    await account.logout();
  }
}
