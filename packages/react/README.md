# AllAuth React SDK 1.3.4

A portable React SDK backed by the app's same-origin AllAuth proxy. Install the
versioned tarball plus its declared peers, and import `@allauth/react/styles.css`.
React and React DOM must have compatible versions. No Next.js dependency is
required for the React components.

SDK 1.3.4 adds opt-in `UserButton variant="avatar" managementMode="modal"` and
`OrganizationSwitcher variant="compact" managementMode="modal"`. Their existing
page/card defaults remain available.

`UserProfileModal` and `OrganizationProfileModal` are controlled with `open` and
`onClose`; their initial sections are `profile`/`security` and `general`/`members`.
`UserProfile section="profile" | "security" | "all" embedded` and
`OrganizationProfile view="general" | "members" embedded` also work in app pages.

Organisation callbacks receive real native organisations after `setActive`:
`onSelect`, `onCreate`, and `onOrganizationChange(org, reason)`, where reason is
`select`, `create`, `update`, `leave` or `delete`. App tenant provisioning remains
the host's responsibility. A failed creation callback can be retried without
creating another native organisation. Async update/deletion/leave callbacks are
awaited and failures remain visible.

Use only actual native session, membership and connected-account data. The
`allauth` broker provider is shown as AllAuth. All account/organisation operations
remain subject to native server permissions, and the SDK never supplies platform
administrator authority to an application.


SDK 1.3.4 adds `AccountSettings` with native Profile, Security and Organisations
tabs. It shares the same profile panels as `UserProfileModal`, including a photo
picker. `profileImageUpload` is an optional public capability (false on older
servers). Upload prepares an image URL draft; the user's explicit Save profile
applies it. Browser sessions remain separate sign-ins and are never deduplicated.

Dialog headers and navigation stay fixed while the main pane scrolls. Passkey
setup checks browser support and presents native cancellation, recent-login,
expired-challenge and verification errors without bypassing security checks.


SDK 1.3.4 preserves email invitation intent on `AccountSettings` with optional
`invitationId` or the account page's validated `?invitation=`. Accept remains an
explicit native action for the verified invited email. Fresh membership, active
organisation and session are checked before host `onSelect`/selection callbacks;
failed application setup retries without accepting twice. Existing members can
use Open workspace when an old invitation is already closed. Native `SignIn` and `SignUp` preserve a bounded, checked local `returnTo`
through their cross-links and email/Google callbacks. Explicit component callback
props take precedence; invalid query values fall back to the configured callback.
Custom authentication forms must carry the checked destination themselves.


The native return helpers are exported from `@allauth/react`:

- `safeAuthReturnTo(value, basePath?)` validates untrusted local destinations up to 2048 characters and rejects API/proxy paths and encoded aliases.
- `resolveAuthReturnTo(explicit, query, fallback, basePath?)` applies explicit component target, checked query, then provider fallback precedence.
- `withAuthReturnTo(path, intent?)` carries an already checked intent through a local link, retaining other query fields and its hash.
- `useAuthReturnTo(explicit, fallback, basePath?)` reads the browser query after hydration and tracks router updates without browser storage.

A full-page native MFA challenge can also read `callbackUrl` when
`challenge=two-factor` and `returnTo` is absent, using the same validation. The
server preserves checked project app destinations across that challenge while
native verification and signed OAuth continuation checks remain in force.
