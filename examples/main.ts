// Runs one example: npm run example -- <example> [args]

import { check } from "./common.ts";
import * as events from "./events.ts";
import * as firstProgram from "./first-program.ts";
import * as hostedAccount from "./hosted-account.ts";
import * as moveToAccount from "./move-to-account.ts";
import * as offline from "./offline.ts";
import * as recovery from "./recovery.ts";
import * as selfHostedSync from "./self-hosted-sync.ts";
import * as serviceAccounts from "./service-accounts.ts";
import * as shareLinks from "./share-links.ts";
import * as vaultsAndSharing from "./vaults-and-sharing.ts";

const examples: Record<string, (args: string[]) => Promise<void>> = {
  "first-program": firstProgram.run,
  "hosted-account": hostedAccount.run,
  "vaults-and-sharing": vaultsAndSharing.run,
  events: events.run,
  offline: offline.run,
  "move-to-account": moveToAccount.run,
  recovery: recovery.run,
  "self-hosted-sync": selfHostedSync.run,
  "service-accounts": serviceAccounts.run,
  "share-links": shareLinks.run,
  check,
};

const [name, ...args] = process.argv.slice(2);
const run = name ? examples[name] : undefined;
if (!run) {
  console.error(`Usage: npm run example -- <example> [args]\nExamples: ${Object.keys(examples).join(", ")}`);
  process.exit(2);
}
await run(args);
