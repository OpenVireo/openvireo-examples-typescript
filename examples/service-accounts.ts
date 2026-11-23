// Service accounts: create one for CI, then read, inject and write secrets with its token.
//
// Guide: https://developer.openvireo.com/sdk/guides/service-accounts/
//
//     OPENVIREO_SERVICE_ACCOUNT_TOKEN=... npm run example -- service-accounts "ov://Team Infra/CI/token"
//
// create() needs an organisation owner or admin signed in, so run() doesn't call it. Set ROTATE to a
// new value to also write it (needs the write role).

import { type Account, ServiceAccount } from "@openvireo/sdk";
import { env, usage } from "./common.ts";

// Creating one
export async function create(account: Account, orgId: string, vaultId: string): Promise<void> {
  const { token, serviceAccount } = await account.createServiceAccount(orgId, {
    name: "ci",
    vaults: [{ id: vaultId, role: "read" }],
    expiresAt: "2027-01-01T00:00:00Z", // optional
  });
  console.log(token); // show it once; store it as a CI secret

  await account.issueServiceAccountSecret(serviceAccount.id, { name: "staging" });
}

// Reading and writing
export async function run(args: string[]): Promise<void> {
  const [reference] = args;
  if (!reference || args.length !== 1) usage("Usage: service-accounts <ov://Vault/Entry/field>");
  const sa = await ServiceAccount.fromToken(env("OPENVIREO_SERVICE_ACCOUNT_TOKEN"));
  try {
    const password = await sa.read(reference);
    console.log(`${reference}: ${password.length} characters`);

    const { secrets } = await sa.inject(`TOKEN=${reference.replaceAll(" ", "%20")}\n`); // mask `secrets` in logs
    console.log(`injected ${secrets.length} secret(s)`);

    const rotated = process.env.ROTATE;
    if (rotated) await sa.write(reference, rotated); // needs the write role
  } finally {
    sa.close(); // wipes the keys from memory
  }
}
