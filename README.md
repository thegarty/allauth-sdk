# AllAuth SDK

The portable AllAuth React SDK, its Next.js app proxy, and verified release archives. The hosted AllAuth platform backend and its configuration are maintained separately.

## Install

```sh
pnpm add https://allauth.co/sdk/allauth-react-1.4.3.tgz better-auth@1.7.7 @better-auth/passkey@1.7.7 lucide-react@0.575.0
```

Use compatible React and React DOM versions from the SDK's [peer dependency ranges](packages/react/package.json), and import `@allauth/react/styles.css`. Next.js is needed only for the Next.js adapter. Optional Better Auth UI integration has additional peers declared in that manifest.

See the exact packaged [integration guide](packages/react/README.md), [repository docs](docs/README.md), [changelog](CHANGELOG.md), and [GitHub releases](https://github.com/thegarty/allauth-sdk/releases). Each release provides its original `.tgz` and a SHA-256 checksum. Canonical downloads remain at [allauth.co/sdk](https://allauth.co/sdk/allauth-react-1.4.3.tgz).

## Source and history

`packages/react` is byte-identical to the current verified archive. Tags `v1.0.0` through `v1.4.3` reconstruct 16 already-public archive snapshots. The supplementary v1.0.0 import is an orphan commit; the initial 15 tags were not rewritten. These Git commits and tags were imported on 2026-10-30; their dates are not original historical release dates. Historical publication dates remain unknown where the catalog says so. Packaged READMEs, including working-candidate wording, are preserved exactly. See [provenance](PROVENANCE.md) and the [release catalog](releases/catalog.json).

## Development

Tooling uses Node.js 22.22.3 and pnpm 11.1.1.

```sh
pnpm install --frozen-lockfile
pnpm check
```

Checks cover archive hashes, exact tagged source trees, source disclosure checks, actual native-client request invalidation behavior, and TypeScript. The regression check uses synthetic data and a local fetch stub; it needs no AllAuth account or service credentials.

## Releasing

Follow [RELEASING.md](RELEASING.md). A version tag runs checks, creates a draft GitHub release, attaches and verifies the immutable archive and checksum, then publishes. Existing published releases are verified without replacing their assets. CI uses GitHub's repository token and requires no hosted AllAuth backend secrets.

## License status

The imported SDK archives have no explicit SDK license declaration or LICENSE file. This repository does not add a license or grant new rights. Dependency licenses and third-party terms remain separate. Package manifests retain `private: true`; npm publishing and namespace ownership have not been established.
