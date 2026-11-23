// Live events: react when another device changes a vault, or when access changes.
//
// Guide: https://developer.openvireo.com/sdk/guides/events/
//
// Running it signs in, opens the first vault and prints events until you press Ctrl-C. Edit
// something in another OpenVireo app to see one.
//
//     npm run example -- events

import type { Account, AccountVault, VaultInfo } from "@openvireo/sdk";
import { signIn } from "./common.ts";

function render(vaults: VaultInfo[]): void {
  console.log("Vaults now:", vaults.map((v) => v.name).join(", "));
}

export function watch(account: Account, vault: AccountVault): { close(): void } {
  return account.subscribe({
    onVaultChanged: (e) => {
      // another device uploaded (or deleted) a vault this account can open
      console.log("Vault changed:", e.vaultId);
      if (e.vaultId === vault.id && e.etag !== vault.etag) void vault.sync({ localChanged: false });
    },
    onVaultsChanged: (vaults) => render(vaults), // access changed: vaults added, removed or re-keyed
    onError: (e) => console.warn("events", e),
  });
}

export async function run(): Promise<void> {
  const account = await signIn();
  const [first] = await account.listVaults();
  if (!first) {
    console.log("No vaults to watch.");
    return account.logout();
  }
  const live = watch(account, await account.openVault(first.id));
  console.log("Watching for changes (Ctrl-C to stop)...");
  await new Promise<void>((resolve) => process.once("SIGINT", resolve));
  live.close(); // when the app no longer needs it
  await account.logout();
}
