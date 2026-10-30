# AllAuth React SDK 1.3.0

A portable React SDK backed by the app's same-origin AllAuth proxy. Install the
versioned tarball plus its declared peers, and import `@allauth/react/styles.css`.
React and React DOM must have compatible versions. No Next.js dependency is
required for the React components.

SDK 1.3.0 adds opt-in `UserButton variant="avatar" managementMode="modal"` and
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


SDK 1.3.0 adds `AccountSettings` with native Profile, Security and Organisations
tabs. It shares the same profile panels as `UserProfileModal`, including a photo
picker. `profileImageUpload` is an optional public capability (false on older
servers). Upload prepares an image URL draft; the user's explicit Save profile
applies it. Browser sessions remain separate sign-ins and are never deduplicated.

Dialog headers and navigation stay fixed while the main pane scrolls. Passkey
setup checks browser support and presents native cancellation, recent-login,
expired-challenge and verification errors without bypassing security checks.
