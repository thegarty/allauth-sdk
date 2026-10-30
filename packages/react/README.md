# AllAuth React SDK 1.3.5 (working candidate)

Latest verified published SDK: **1.3.4**, [download](https://allauth.co/sdk/allauth-react-1.3.4.tgz).
SHA-256: `ead480cbdcc502e29c78a26bc849845478e7de3bd8a9369b546cbbb3008998a5`.
The working SDK is **1.3.5** and includes additional signup changes; publish it as
a newer version after its checks. The published 1.3.4 archive is immutable.

A portable React SDK backed by the app's same-origin AllAuth proxy. Install the
versioned tarball plus its declared peers, and import `@allauth/react/styles.css`.
React and React DOM must have compatible versions. No Next.js dependency is
required for the React components.

The working 1.3.5 candidate aligns signup with the selected environment's registration and email
verification policy. The optional `signUpEnabled` and
`emailVerificationRequired` capability flags hide disabled registration and
route completed signups to sign-in when verification is explicitly disabled.
Older servers retain the verification-first behavior. Signup passwords must
contain at least 12 characters, matching the server. This release also preserves
checked local return destinations through native authentication and recovery.

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
use Open workspace when an old invitation is already closed. In SDK 1.3.4,
`SignIn` and `SignUp` automatically preserve a bounded, checked local `returnTo`
through their links and email/Google callbacks. Explicit component callback
props take precedence; invalid query values fall back to the provider callback.
Custom authentication forms must carry the checked destination themselves.

**Working 1.3.5 feature:** `SignUp` accepts an optional `checkEmailUrl` for the local page shown after a
successful email signup that has no session:

```tsx
<SignUp checkEmailUrl="/check-email" afterSignUpUrl="/workspace" />
```

Keep `/check-email` public. `afterSignUpUrl` remains the callback in the
verification email and the destination for signup with a usable session; Google
signup also keeps this final callback. `checkEmailUrl` only controls the pending
email step and must be a path within the app. No email address or credential is
added to it. Without this prop, the card shows a dedicated Check your email state
and hides signup and Google controls. Keep the mounted form during session
refreshes so a background check does not erase the signup result.

When a checked return intent exists, `checkEmailUrl` carries it as `returnTo` so
the pending-email page can keep its sign-in link connected to the original task.
The verification email still points to the final destination.

The return helpers are exported from `@allauth/react`:

- `safeAuthReturnTo(value, basePath?)` validates local destinations up to 2048
  characters and rejects API/proxy paths, encoded aliases and external origins.
- `resolveAuthReturnTo(explicit, query, fallback, basePath?)` applies the explicit
  component target, checked query, then provider fallback in that order.
- `withAuthReturnTo(path, intent?)` carries an already checked intent through a
  local link, retaining other query fields and its fragment.
- `useAuthReturnTo(explicit, fallback, basePath?)` reads the browser query after
  hydration and observes router re-renders and browser history without storage.

A full-page native MFA challenge can also read a checked `callbackUrl` when
`challenge=two-factor` and `returnTo` is absent. Native verification is still
required before navigating.
