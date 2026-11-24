# OpenVireo examples: TypeScript

Runnable examples for the [OpenVireo](https://openvireo.com) TypeScript SDK (`@openvireo/sdk`), one file
per guide on [developer.openvireo.com](https://developer.openvireo.com). Each file holds the code from its
guide's **TypeScript** tab, wrapped in a program you can run with Node.

Examples in other languages: [Rust](https://github.com/openvireo/openvireo-examples-rust) · [Python](https://github.com/openvireo/openvireo-examples-python) · [Kotlin](https://github.com/openvireo/openvireo-examples-kotlin) · [Java](https://github.com/openvireo/openvireo-examples-java) · [Swift](https://github.com/openvireo/openvireo-examples-swift) · [C++](https://github.com/openvireo/openvireo-examples-cpp) · [ov CLI](https://github.com/openvireo/openvireo-examples-cli)

## Run them

You need Node 22.18 or newer (it runs the `.ts` files directly). The SDK is on GitHub Packages, which
asks for a token even for public packages: make a GitHub personal access token (classic) with the
`read:packages` scope and export it as `GITHUB_TOKEN` before installing. The repo's `.npmrc` points
`@openvireo` at GitHub Packages.

```sh
git clone https://github.com/openvireo/openvireo-examples-typescript
cd openvireo-examples-typescript
export GITHUB_TOKEN=ghp_...
npm install
npm run example -- check
```

Set your account in the environment. `OV_SECRET_KEY` is only needed the first time on a device;
`OV_ISSUER` picks an account server other than `https://accounts.openvireo.com`.

```sh
export OV_EMAIL=you@example.com OV_PASSWORD='...' OV_SECRET_KEY='A3-...'
```

```sh
npm run example -- first-program "ov://Personal/GitHub/username"
npm run example -- vaults-and-sharing
```

The examples keep sessions in memory (`MemoryStorage`). A web app passes `browserStorage()` instead,
which keeps them in IndexedDB.

## The examples

| Example | What it does | Guide |
|---|---|---|
| [`first-program.ts`](examples/first-program.ts) | Sign in, list the vaults, read one field, sign out | [A first program](https://developer.openvireo.com/sdk/#a-first-program) |
| [`hosted-account.ts`](examples/hosted-account.ts) | Connect, sign up, sign in with two-step codes, lock, devices, account deletion | [Hosted accounts](https://developer.openvireo.com/sdk/guides/hosted-account/) |
| [`vaults-and-sharing.ts`](examples/vaults-and-sharing.ts) | List, open, read, write and edit vaults; share, revoke, organisations | [Vaults and sharing](https://developer.openvireo.com/sdk/guides/vaults-and-sharing/) |
| [`events.ts`](examples/events.ts) | Follow live changes from other devices | [Events](https://developer.openvireo.com/sdk/guides/events/) |
| [`offline.ts`](examples/offline.ts) | Edit offline, merge when back online | [Offline](https://developer.openvireo.com/sdk/guides/offline/) |
| [`move-to-account.ts`](examples/move-to-account.ts) | Import a `.kdbx` file as a new vault or merge it into one | [Moving to an account](https://developer.openvireo.com/sdk/guides/move-to-account/) |
| [`recovery.ts`](examples/recovery.ts) | Inspect a recovery link, reset, restore the old vaults | [Recovery](https://developer.openvireo.com/sdk/guides/recovery/) |
| [`self-hosted-sync.ts`](examples/self-hosted-sync.ts) | Pair with a self-hosted sync server and sync a `.kdbx` file | [Self-hosted sync](https://developer.openvireo.com/sdk/guides/self-hosted-sync/) |
| [`service-accounts.ts`](examples/service-accounts.ts) | Create a service account; read, inject and write with its token | [Service accounts](https://developer.openvireo.com/sdk/guides/service-accounts/) |
| [`share-links.ts`](examples/share-links.ts) | Share an item or text by link, list and revoke links, open one | [Share links](https://developer.openvireo.com/sdk/guides/share-links/) |

Each file has one function per section of its guide. Running an example does something safe and
mostly read-only; the functions that change an account for good (deleting it, revoking access,
rotating keys) are there to read and copy, and the programs don't call them. Try the rest on a test
account. `check` reaches the account server without signing in, to test the setup.

## Checks

CI type-checks every example against the SDK's types with `tsc --strict` and runs `check`, on every
push and weekly:

```sh
npm run check
```

## License

MIT. Copy the code into your own programs.
