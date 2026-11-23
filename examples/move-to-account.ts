// Moving a .kdbx file into an account: as a new vault, or merged into a vault you already have.
//
// Guide: https://developer.openvireo.com/sdk/guides/move-to-account/
//
//     npm run example -- move-to-account Passwords.kdbx            # a new vault named after the file
//     npm run example -- move-to-account Passwords.kdbx Personal   # merge into the vault "Personal"
//
// The file's password is read from KDBX_PASSWORD.

import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { type Account, type AccountVault, VaultUploadError, decryptKdbx } from "@openvireo/sdk";
import { importInto } from "@openvireo/sdk/merge";
import { env, signIn, usage } from "./common.ts";

export async function importAsNewVault(account: Account, fileBytes: Uint8Array, password: string, name: string): Promise<void> {
  const { vault: localDb } = await decryptKdbx(fileBytes, password);
  try {
    const vault = await account.importVault(localDb, { name }); // or { name, orgId } for an org vault
    console.log("Imported into", vault.name);
  } catch (e) {
    if (!(e instanceof VaultUploadError)) throw e;
    await e.vault.sync(); // the vault exists but its first upload failed: retry it later
  }
}

export async function mergeInto(vault: AccountVault, fileBytes: Uint8Array, password: string): Promise<void> {
  const { vault: file } = await decryptKdbx(fileBytes, password);
  const { added, updated, unchanged } = importInto(file, vault.vault);
  // or: importAsCopies(file, vault.vault, groupUuid), with importTargets(vault.vault) listing the groups to offer
  await vault.sync();
  console.log({ added, updated, unchanged });
}

export async function run(args: string[]): Promise<void> {
  const [path, into] = args;
  if (!path || args.length > 2) usage("Usage: move-to-account <file.kdbx> [vault name]");
  const fileBytes = new Uint8Array(await readFile(path));
  const password = env("KDBX_PASSWORD");
  const account = await signIn();
  try {
    if (!into) {
      await importAsNewVault(account, fileBytes, password, basename(path, ".kdbx"));
    } else {
      const info = (await account.listVaults()).find((v) => v.name === into);
      if (!info) usage(`No vault named ${into}`);
      await mergeInto(await account.openVault(info.id), fileBytes, password);
    }
  } finally {
    await account.logout();
  }
}
