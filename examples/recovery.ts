// Account recovery: resetting with a recovery link, and restoring the old vaults afterwards.
//
// Guide: https://developer.openvireo.com/sdk/guides/recovery/
//
//     npm run example -- recovery info <token>   # what a reset would do; works signed out
//     npm run example -- recovery status         # after a reset: is there an archive to restore?
//
// reset() and restore() change the account, so they only run when you call them yourself.

import type { Account } from "@openvireo/sdk";
import { connect, signIn, usage } from "./common.ts";

// Resetting
export async function info(account: Account, token: string): Promise<void> {
  const info = await account.recoverInfo(token); // works signed out
  console.log(info); // { email, notBefore, expiresAt, archiveDays, archives: { personalVaults, sharedGrants, soleAdminOrgs } }
}

export async function reset(account: Account, token: string, password: string): Promise<void> {
  const { secretKey } = await account.recover({ token, password }); // signed in and unlocked afterwards
  console.log("Your new Secret Key (keep it safe):", secretKey);
}

// Restoring the old vaults
export async function restore(account: Account, oldPassword: string, oldSecretKey: string): Promise<void> {
  const status = await account.recoveryStatus(); // { archived, email?, expiresAt?, vaults?, locked? }
  if (status.archived && !status.locked) {
    const { restored } = await account.restoreFromArchive({ oldPassword, oldSecretKey }); // vault list reloaded
    console.log("restored", restored);
  }
}

export async function run(args: string[]): Promise<void> {
  if (args[0] === "info" && args[1] && args.length === 2) {
    await info(await connect(), args[1]);
  } else if (args.length === 1 && args[0] === "status") {
    const account = await signIn();
    console.log(await account.recoveryStatus());
    await account.logout();
  } else {
    usage("Usage: recovery info <token> | recovery status");
  }
}
