// Shared setup for the examples: an account signed in from environment variables.
//
// Set OV_EMAIL, OV_PASSWORD and OV_SECRET_KEY (and OV_ISSUER for a server other than
// https://accounts.openvireo.com). The Secret Key is only needed the first time on a device.

import { createInterface } from "node:readline/promises";
import { Account, MemoryStorage } from "@openvireo/sdk";

export const issuer = process.env.OV_ISSUER || "https://accounts.openvireo.com";

export function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Set ${name} to run this example.`);
    process.exit(1);
  }
  return value;
}

export function usage(text: string): never {
  console.error(text);
  process.exit(2);
}

export async function prompt(text: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(text)).trim();
  } finally {
    rl.close();
  }
}

export const askForCode = () => prompt("Authenticator code: ");

/** Connects with memory storage (every run is a new device). A web app passes browserStorage(). */
export function connect(name = "OpenVireo examples", offline = false): Promise<Account> {
  return Account.connect({ issuer, device: { name, platform: "cli" }, storage: new MemoryStorage(), offline });
}

/** Connects and signs in, asking for a TOTP code when two-step sign-in is on. */
export async function signIn(): Promise<Account> {
  const account = await connect();
  await account.login({
    email: env("OV_EMAIL"),
    password: env("OV_PASSWORD"),
    secretKey: process.env.OV_SECRET_KEY,
    totp: () => askForCode(),
  });
  return account;
}

/** Reaches the account server, without signing in. */
export async function check(): Promise<void> {
  const account = await connect();
  console.log(`Connected to ${issuer} (API ${account.config.api}); signed in: ${account.signedIn}`);
}
