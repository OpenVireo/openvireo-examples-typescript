// Share links: share one item, or some text, through a link that needs no account; list and revoke
// links; open one.
//
// Guide: https://developer.openvireo.com/sdk/guides/share-links/
//
//     npm run example -- share-links list
//     npm run example -- share-links text "The alarm code is 4321"
//     npm run example -- share-links open "https://share.openvireo.com/<id>#<key>"

import {
  type Account,
  type AccountVault,
  DEFAULT_SHARE_FIELDS,
  findEntry,
  itemOf,
  itemSharePayload,
  shareableFields,
  textSharePayload,
} from "@openvireo/sdk";
import { getShareInfo, openShare, parseShareLink, parseTotpUri, totpCode } from "@openvireo/sdk/share";
import { prompt, signIn, usage } from "./common.ts";

// Making a link
export async function shareEntry(account: Account, vault: AccountVault, entryId: string): Promise<string> {
  const item = itemOf(findEntry(vault.vault, { groupPath: [], entry: entryId }), { reveal: true });

  // What can be shared, in display order: [{ name: "UserName", field: { k: "username", … } }, …]
  const choices = shareableFields(item);
  console.log("can share:", choices.map((c) => c.name));

  const payload = itemSharePayload(item, DEFAULT_SHARE_FIELDS, "Sam"); // username, password, website
  const link = await account.createShare(payload, {
    expiresIn: 7 * 86400, // seconds: 1 hour to 30 days (free plans: 7 days)
    maxOpens: 1, // null or left out: until it expires
    vaultId: vault.id,
    entryId: item.id,
  });
  return link.url; // https://share.openvireo.com/<id>#<key>
}

export async function shareText(account: Account, text: string): Promise<string> {
  const link = await account.createShare(textSharePayload(text, "From the examples"), {
    expiresIn: 3600,
    passcode: "tiger lily 42",
  });
  return link.url;
}

// Listing and revoking
export async function listShares(account: Account): Promise<void> {
  for (const s of await account.listShares()) {
    // ref is { vault, entry, title }, readable only by this account
    console.log(s.id, s.ref?.title, s.status, s.opens, s.maxOpens, s.expiresAt, s.endReason);
  }
}

export async function revoke(account: Account, id: string): Promise<void> {
  await account.revokeShare(id);
}

export async function orgPolicy(account: Account, orgId: string): Promise<void> {
  await account.auth.setOrgShareLinks(orgId, "managers"); // "on" (default), "managers" or "off"
}

// Opening a link (the share page does this with location.href)
export async function openLink(api: string, link: string): Promise<void> {
  const { id, key } = parseShareLink(link);
  const info = await getShareInfo(api, id); // { expiresAt, opensLeft, kdf }; doesn't count as an open
  // Show a "Reveal" button and open only when it's pressed: link previews then can't use up a one-time link.
  await prompt(`Opens left: ${info.opensLeft ?? "unlimited"}. Press Enter to reveal... `);
  const passcode = info.kdf ? await prompt("Passcode: ") : undefined;
  const { payload } = await openShare(api, { id, key }, { passcode, info });

  for (const f of payload.fields) {
    const shown = f.k === "totp" ? totpCode(parseTotpUri(f.value)).code : f.value;
    // render as plain text; hide f.protected values until shown
    console.log(`${f.label}: ${shown}`);
  }
}

export async function run(args: string[]): Promise<void> {
  const account = await signIn();
  try {
    if (args.length === 1 && args[0] === "list") await listShares(account);
    else if (args.length === 2 && args[0] === "text") console.log(`${await shareText(account, args[1]!)}\npasscode: tiger lily 42`);
    else if (args.length === 2 && args[0] === "open") await openLink(account.config.api, args[1]!); // or the share host's API
    else usage("Usage: share-links list | text <text> | open <link>");
  } finally {
    await account.logout();
  }
}
