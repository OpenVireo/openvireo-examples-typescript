// Offline: edit from the cached copy while the servers can't be reached, and merge the edits in when
// back online.
//
// Guide: https://developer.openvireo.com/sdk/guides/offline/
//
// To unlock offline after a restart, the account needs persistent storage (browserStorage() in a web
// app). These examples keep it in memory, so this program signs in (online) and then edits, keeping
// the edit if the network drops.
//
//     npm run example -- offline "ov://Home/Wifi/password" "new value"

import { isUnreachable } from "@openvireo/sdk";
import { askForCode, connect, env, usage } from "./common.ts";

export async function run(args: string[]): Promise<void> {
  const [reference, value] = args;
  if (!reference || value === undefined || args.length !== 2) usage("Usage: offline <ov://Vault/Entry/field> <value>");

  const account = await connect("Laptop", true); // offline: true
  // with persistent storage, a later run only needs: await account.unlock(password)
  await account.login({ email: env("OV_EMAIL"), password: env("OV_PASSWORD"), secretKey: env("OV_SECRET_KEY"), totp: askForCode });
  const name = reference.slice("ov://".length).split("/")[0];
  const info = (await account.listVaults()).find((v) => v.name === name);
  if (!info) usage(`No vault named ${name}`);
  const vault = await account.openVault(info.id); // offline: the local copy
  console.log("offline:", account.offline); // true while the servers can't be reached

  await vault.write(reference, value).catch((e: unknown) => {
    if (!isUnreachable(e)) throw e; // offline: the edit is kept and merges in later
    console.log("Saved locally; it uploads when you're back online.");
  });

  if (account.offline) {
    const { dropped } = await account.reconnect(); // back online; revoked vaults are forgotten
    console.log("reconnected; dropped:", dropped);
    await vault.sync(); // uploads the kept edit
  }
  await account.logout();
}
