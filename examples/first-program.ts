// A first program: sign in, list the vaults, read one field and sign out.
//
// Guide: https://developer.openvireo.com/sdk/#a-first-program
//
//     npm run example -- first-program "ov://Personal/GitHub/username"

import { Account, MemoryStorage } from "@openvireo/sdk";
import { env, issuer } from "./common.ts";

export async function run(args: string[]): Promise<void> {
  const [email, password, secretKey] = [env("OV_EMAIL"), env("OV_PASSWORD"), env("OV_SECRET_KEY")];

  const account = await Account.connect({
    issuer,
    device: { name: "My script", platform: "cli" },
    storage: new MemoryStorage(),
  });
  await account.login({ email, password, secretKey });

  const vaults = await account.listVaults();
  for (const info of vaults) {
    console.log(info.name, info.role);
  }
  if (vaults[0] && args[0]) {
    const vault = await account.openVault(vaults[0].id);
    console.log(vault.read(args[0]));
  }
  await account.logout();
}
