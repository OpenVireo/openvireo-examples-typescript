// A self-hosted sync server: pairing a device, syncing a .kdbx file, and the other calls.
//
// Guide: https://developer.openvireo.com/sdk/guides/self-hosted-sync/
//
//     npm run example -- self-hosted-sync https://sync.example.org ABCD-EFGH personal Passwords.kdbx
//
// Pairs with the server, syncs the file (password from KDBX_PASSWORD; the merged file is written back
// to the same path) and shows the other calls. The pairing lives in memory here; with persistent
// storage (browserStorage() in a web app), SelfHostedSync.restore finds it again next time.

import { readFile, writeFile } from "node:fs/promises";
import { MemoryStorage, SelfHostedSync, decryptKdbx, passwordCredentials } from "@openvireo/sdk";
import { env, usage } from "./common.ts";

export async function run(args: string[]): Promise<void> {
  const [url, pairingCode, databaseId, path] = args;
  if (!url || !pairingCode || !databaseId || !path || args.length !== 4) {
    usage("Usage: self-hosted-sync <server url> <pairing code> <database id> <file.kdbx>");
  }
  const storage = new MemoryStorage();

  // Pairing
  const server =
    (await SelfHostedSync.restore(url, { storage })) ?? // next time
    (await SelfHostedSync.pair(url, pairingCode, "Laptop", { storage }));

  // Syncing a database
  const password = env("KDBX_PASSWORD");
  const { vault } = await decryptKdbx(new Uint8Array(await readFile(path)), password);
  const result = await server.syncDatabase(databaseId, await vault.saveLocal(), passwordCredentials(password));
  // result.kdbx is the merged file: save it locally and reopen it (result.report says what changed)
  await writeFile(path, result.kdbx);
  console.log(result.report);

  // Other calls
  console.log(await server.health()); // '{"status":"ok"}'; not_sync_server for another site
  console.log(await server.listDatabases()); // [{ id, revision, etag, size, updatedAt }]
  const first = await server.download(databaseId); // the .kdbx as uploaded, or null; opens with its password
  console.log(`${databaseId}: ${first?.length ?? 0} bytes`);
  const { code } = await server.createPairingCode(); // for the next device
  console.log("pairing code for the next device:", code);
  const stream = server.events((e) => e.kind === "databaseChanged" && console.log("changed:", e.databaseId));
  stream.close();
}
