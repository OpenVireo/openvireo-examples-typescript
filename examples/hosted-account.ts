// Hosted accounts: connecting, signing up and in, locking, the account itself, devices and deletion.
//
// Guide: https://developer.openvireo.com/sdk/guides/hosted-account/
//
// Running it signs in, prints the account and its devices, locks and unlocks, and signs out. The
// functions that change the account (signUp, changePassword, deleteAccount, ...) are here to read and
// copy; run() doesn't call them.
//
//     npm run example -- hosted-account

import { Account, MemoryStorage } from "@openvireo/sdk";
import { askForCode, env, issuer, prompt } from "./common.ts";

// Connecting
export function connect(): Promise<Account> {
  return Account.connect({
    issuer, // discovery: /.well-known/openvireo-configuration
    device: { name: "Backup script", platform: "cli" },
    storage: new MemoryStorage(), // where sessions and trusted-device keys live; browserStorage() in a web app
  });
}

// Signing up
export async function signUp(account: Account, email: string, password: string): Promise<void> {
  const { secretKey } = await account.register({ email, password });
  showEmergencyKit(secretKey); // the only time the Secret Key is shown; the user must keep it
}

function showEmergencyKit(secretKey: string): void {
  console.log("Your Secret Key (keep it safe):", secretKey);
}

// Signing in
export async function signIn(account: Account, email: string, password: string, secretKey?: string): Promise<void> {
  await account.login({
    email,
    password,
    secretKey, // only needed the first time on this device
    totp: () => askForCode(), // asked only when the account has two-factor authentication on
  });
}

// Unlocking and locking
export async function lockAndUnlock(account: Account, password: string): Promise<void> {
  account.lock(); // wipes the keys from memory; the session stays
  if (account.signedIn && !account.unlocked) await account.unlock(password);
}

export async function signOut(account: Account, forgetDevice: boolean): Promise<void> {
  // ends the session on the server and forgets it here; forgetDevice also forgets the trusted Secret Key
  await account.logout({ forgetDevice });
}

// Staying unlocked across a page reload (a web app keeps the sealed keys in sessionStorage)
export async function stayUnlocked(account: Account, reloaded: Account): Promise<void> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const sealed = await account.sealUnlocked(key);
  // after the reload, on a connected (signed-in, locked) account
  await reloaded.resumeUnlocked(sealed, key);
}

export function watchForSignOut(account: Account): () => void {
  return account.onSignedOut((reason) => {
    // "session_expired" | "token_reused" | "unauthorized" | "logout"
    console.log("Signed out:", reason);
  });
}

// The account itself
export function showAccount(account: Account): void {
  console.log("email:", account.email);
  console.log("user id:", account.userId);
  console.log("fingerprint:", account.fingerprint); // this account's public key fingerprint, for others to compare
}

export async function changePassword(account: Account, current: string, next: string): Promise<void> {
  await account.changePassword({ current, next }); // signs the other devices out
}

export async function changeEmail(account: Account, email: string, password: string): Promise<void> {
  await account.requestEmailChange(email); // mails a code to the new address
  const code = await prompt(`Code sent to ${email}: `);
  await account.changeEmail({ email, code, password });
}

export function accountWebsiteLink(account: Account): Promise<string> {
  return account.webSessionUrl("/settings"); // a one-time link into the account website (60 s)
}

// Devices
export async function listDevices(account: Account): Promise<void> {
  const { devices } = await account.auth.listDevices(); // name, platform, last_seen_at, current, …
  for (const d of devices) console.log(d.name, d.platform, d.last_seen_at, d.current ? "(this device)" : "");
}

export async function revokeDevice(account: Account, name: string): Promise<void> {
  const { devices } = await account.auth.listDevices();
  const old = devices.find((d) => !d.current && d.name === name);
  if (old) await account.auth.revokeDevice(old.id);
}

// Deleting the account
export async function deleteAccount(account: Account, password: string, typedEmail: string, heir?: string): Promise<void> {
  const preview = await account.deletionPreview();
  console.log("would be erased on", preview.eraseOn);
  console.log("vaults:", preview.vaults); // { id, name, sharedWith }: shared vaults can be given away first
  console.log("orgs:", preview.orgs); // outcome "leave", "delete" (deleted with the account) or "blocked"
  if (heir && preview.vaults[0]?.sharedWith.length) await account.transferVault(preview.vaults[0].id, heir);

  const { scheduledFor } = await account.deleteAccount({ password, confirm: typedEmail });
  console.log("scheduled for", scheduledFor);
  // This device is signed out (onSignedOut reports "deletion_scheduled") and its offline cache is gone.
  // The Secret Key stays so the user can sign in again and restore:
  if (account.deletionScheduledFor) await account.restoreAccount({ password });
}

export async function run(): Promise<void> {
  const password = env("OV_PASSWORD");
  const account = await connect();
  await signIn(account, env("OV_EMAIL"), password, env("OV_SECRET_KEY"));
  showAccount(account);
  await listDevices(account);
  await lockAndUnlock(account, password);
  await signOut(account, false);
}
