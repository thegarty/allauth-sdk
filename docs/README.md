# SDK documentation

- [Packaged SDK guide](../packages/react/README.md): integration instructions exactly as distributed in the latest verified archive.
- [Optional Better Auth UI adapter](../packages/react/BETTER_AUTH_UI.md).
- [Release notes](../CHANGELOG.md) and [machine-readable catalog](../releases/catalog.json).
- [Source provenance](../PROVENANCE.md) and [release procedure](../RELEASING.md).

React components send requests through the embedding application's same-origin proxy. Configure application proxy credentials only in that application's server environment. This repository's tests and CI do not need those credentials.

Historical source is available under `packages/react` at each `vVERSION` tag. Import commits were made during reconstruction on 2026-10-30. Unknown publication dates remain unknown; repository import dates and archive timestamps are not substituted for them.

SDK manifests remain private and unlicensed as imported. Publishing source and release assets here does not establish an npm namespace or a new license.
