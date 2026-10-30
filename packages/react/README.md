# AllAuth React SDK 1.4.1

Latest verified published SDK: **1.3.4**, [download](https://allauth.co/sdk/allauth-react-1.3.4.tgz).
SHA-256: `ead480cbdcc502e29c78a26bc849845478e7de3bd8a9369b546cbbb3008998a5`.
The default setup SDK is **1.4.1** and includes automatic Google, Apple and Microsoft sign-in, signup, organization, connected-support and environment-specific provider improvements. Publish its versioned archive alongside the matching service changes. Previously published archives are immutable.

A portable React SDK backed by the app's same-origin AllAuth proxy. Install the
versioned tarball plus its declared peers, and import `@allauth/react/styles.css`.
React and React DOM must have compatible versions. No Next.js dependency is
required for the React components.

The working 1.4.0 candidate aligns signup with the selected environment's registration and email
verification policy. The optional `signUpEnabled` and
`emailVerificationRequired` capability flags hide disabled registration and
route completed signups to sign-in when verification is explicitly disabled.
Older servers retain the verification-first behavior. The optional `passwordPolicy`
capability supplies per-environment minimum/maximum length and optional uppercase,
lowercase, number and symbol requirements. Signup, reset and password-change forms
show and validate those rules; existing sign-in passwords remain usable. The default
is 8–128 characters with no composition requirements. An older server that omits
`passwordPolicy` uses the same client fallback; native server validation is authoritative.
Configure the rules in User & authentication → Email & password for the selected
application environment. This release also preserves
checked local return destinations through native authentication and recovery.

The working candidate also accepts the optional `googleProvider` capability:
`"google"` selects the environment's direct Google client, `"allauth"` selects
the shared broker, and `null` accompanies `google: false`. Sign-in and signup
use that exact provider while preserving callback and MFA behavior. Older servers
that omit the field keep the shared-broker behavior. Configure direct credentials
under User & authentication → Social connections for the exact environment.

SDK 1.3.4 adds opt-in `UserButton variant="avatar" managementMode="modal"` and
`OrganizationSwitcher variant="compact" managementMode="modal"`. Their existing
page/card defaults remain available.

`UserProfileModal` and `OrganizationProfileModal` are controlled with `open` and
`onClose`; their initial sections are `profile`/`security` and
`general`/`members`/`teams`/`roles` (the last two are in working 1.4.0).
`UserProfile section="profile" | "security" | "all" embedded` and
`OrganizationProfile view="general" | "members" | "teams" | "roles" embedded` also work in app pages.

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

**Working 1.4.0 feature:** `SignUp` accepts an optional `checkEmailUrl` for the local page shown after a
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

Working 1.4.0 adds native Teams and Roles organization settings. Teams support
creation, renaming, confirmed deletion and explicit membership changes. Native
team rosters require the signed-in user to belong to that team; opening a roster
never joins automatically. Roles support custom permission creation/editing and
confirmed deletion. Role names stay fixed after creation to preserve member and
invitation references, and assigned roles cannot be deleted from the UI.

Organization controls check each native server permission, including delegated
custom roles. Member and invitation selectors include readable custom roles;
permission failures keep editing unavailable. Organization/account changes clear
drafts and invalidate pending operation callbacks. Applications must update the
same-origin proxy along with the SDK to allow native permission and role routes.

## Connected-app support

The 1.4.0 candidate supports an explicit handoff from an existing console support
session. Enable `supportAccess: { enabled: true, basePath: "/api/allauth" }` in
`createAllAuthProxy`, and add `supportAccess` to your shared `AllAuthProvider` or
`AllAuthUIProvider`. The server option accepts an optional fixed local
`afterStartUrl` (default `/`). Keep the provider mounted across app navigation.

Register the exact `https://your-app.example/api/allauth/support/callback` URL
in the environment's User & authentication → Support access settings, enable it
and save. Its origin must already be registered. HTTP is allowed only for local
loopback development. The custom server/proxy/provider paths must match.

Start impersonation from Users, then select Open connected app. The banner shows
the real actor, target and expiry. State, PKCE and one-use codes bind the exchange
to that browser and app; session credentials stay in HttpOnly cookies. The same
native support session is revoked from either domain. End support session restores
the app's prior sign-in only while it remains valid, preserving its original
expiry/persistence and any newer sign-in. Restoration is available for up to
20 minutes and is invalidated by server integration-key rotation. Credentials
and other sensitive identity changes remain blocked during support.

This requires the matching service deployment and SDK update. Existing app
integrations remain disabled until explicitly configured; do not enable the
generic one-time-token endpoint or copy native credentials into redirect URLs.

### Sign in with Apple

The native server advertises optional `apple` and `appleProvider` capabilities only for an environment configured with its own Apple credentials. `SignIn` and `SignUp` then render Continue with Apple and preserve the same-origin return path. Do not pass signing keys to the provider component.

### Continue with Microsoft

The optional `microsoft` and `microsoftProvider` capabilities advertise the environment's native Microsoft connection. `SignIn` and `SignUp` automatically render Continue with Microsoft, preserve return paths and continue native MFA. Omitted or disabled Microsoft capabilities hide the button. Configure the exact environment's server-only `ALLAUTH_PROJECT_MICROSOFT_PROVIDERS` entry and Microsoft Entra Web return URL; see `docs/content/docs/integrations/allauth-tenant-microsoft.mdx`.

Google, Apple and Microsoft belong in every new app's setup review. Use the standard components without hardcoded capability flags or a manually maintained provider list. Each environment still requires its own registered provider configuration, and existing apps need the new SDK archive to receive new buttons.

The Next.js proxy canonically serializes outgoing query parameters before signing
and sending them. This matches Next ingress encoding for mobile Google callbacks
containing `%20` spaces. It groups repeated keys and orders integer-like keys as
Next does, while preserving every value, repeated value order and opaque
state/code data. Custom proxies must sign the exact canonical URL they send;
signature verification remains required.

The Next.js proxy supports Apple's exact HTTPS `form_post` callback while preserving signed OAuth state and all other POST origin checks. Deploy matching server and SDK changes together. See `docs/content/docs/integrations/allauth-tenant-apple.mdx` for the server-only environment map, HTTPS return URLs, private-relay continuity and mail prerequisites.

Owned-photo lifecycle availability is a separate optional boolean, `profileImageOwnershipAndDeletion` (false when absent). Native integrations that require owner-bound draft erasure must require both this flag and `profileImageUpload`. Legacy branding-backed upload availability alone does not establish user erasure. See the owning-service [source and rollout contract](../../../docs/content/docs/integrations/allauth-owned-profile-photos.mdx); no new provider configuration is activated by this SDK field.
