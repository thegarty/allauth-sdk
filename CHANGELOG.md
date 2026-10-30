# Changelog

These notes reconstruct verified public archive contents. Git import dates are not historical SDK publication dates. Unknown dates are retained as unknown.

## 1.4.3

Organisation permission and slug checks no longer reload the active organisation. The organisation manager verifies fully granted permissions in one request, reducing delays and request-limit errors. Existing APIs, sign-in flows and organisation permissions remain compatible. Upgrade your pinned SDK package and rebuild your application when convenient.

Publication date: 2026-10-30T01:14:16Z

- Read-only organisation permission and slug checks no longer invalidate active organisation hooks.
- Organisation managers with all required permissions use one combined native permission check; delegated permissions retain individual verification.
- Optional SDK-version reports support advisory dashboard update notices without requiring access to customer source code.

[Source](https://github.com/thegarty/allauth-sdk/tree/v1.4.3/packages/react) · [Archive](https://allauth.co/sdk/allauth-react-1.4.3.tgz) · [Release record](https://allauth.co/releases/sdk-1-4-3)

SHA-256: `1945650e97e2ad364e7be36f87d276c58544c3ed2e589ce187aa7a4489c96178`

## 1.4.2

Refines the native account dialog and adds a host callback after a saved profile refresh.

Publication date: unknown; reconstructed from retained archives.

- Adds the optional async UserButton.onProfileUpdated callback for synchronizing an application's member profile after the native save and session refresh.
- Refines profile identity, verified-email and connected-account presentation, and retains profile editing after a successful save.
- Adds keyboard navigation between account sections and passes appearance options into the native account modal.

[Source](https://github.com/thegarty/allauth-sdk/tree/v1.4.2/packages/react) · [Archive](https://allauth.co/sdk/allauth-react-1.4.2.tgz) · [Release record](https://allauth.co/releases/sdk-1-4-2)

SHA-256: `1869eb5051032b377f967dd58f538e4b31103ef05eb8260c03dc51b1464bb7f6`

## 1.4.1

Adds environment-advertised social providers and improves signed callback handling in the Next.js proxy.

Publication date: unknown; reconstructed from retained archives.

- SignIn and SignUp render Apple and Microsoft buttons when the selected environment advertises configured native providers.
- The Next.js proxy canonicalizes query parameters before signing mobile Google callbacks, preserving repeated values and opaque OAuth data.
- Allows Apple's checked HTTPS form_post callback while retaining other POST origin checks and native state verification.
- Adds a separate optional owned-photo lifecycle capability; the capability does not itself enable or configure a provider.

[Source](https://github.com/thegarty/allauth-sdk/tree/v1.4.1/packages/react) · [Archive](https://allauth.co/sdk/allauth-react-1.4.1.tgz) · [Release record](https://allauth.co/releases/sdk-1-4-1)

SHA-256: `4e473030ceebebd3273cb200d374587f9478ccc8bafd1bf0c07845a54b10701d`

## 1.4.0

Adds native organisation teams and role controls, policy-driven password forms and explicit connected-application support integration.

Publication date: unknown; reconstructed from retained archives.

- Adds Teams and Roles views with server permission checks, custom-role selectors and scoped organisation operations.
- Introduces optional per-environment password policy and direct Google provider capabilities; native server policy remains authoritative.
- Adds opt-in connected-app support routes and a persistent actor/target banner, with browser-bound exchange and prior-session restoration.
- The archived README calls this a working candidate requiring a matching service deployment. The archive is retained here without inventing a deployment date or status.

[Source](https://github.com/thegarty/allauth-sdk/tree/v1.4.0/packages/react) · [Archive](https://allauth.co/sdk/allauth-react-1.4.0.tgz) · [Release record](https://allauth.co/releases/sdk-1-4-0)

SHA-256: `24f1a421c37fea87113d75ac83b6f388bb1527e16b1d49117586af6723b1ee82`

## 1.3.5

Adds optional signup-policy capabilities and a local pending-email destination while preserving checked authentication return paths.

Publication date: unknown; reconstructed from retained archives.

- Uses optional signUpEnabled and emailVerificationRequired capabilities to adapt native signup to the selected environment.
- Adds SignUp.checkEmailUrl for a local pending-verification page while preserving the final verification callback and checked return intent.
- Extends checked return handling through native authentication and recovery links.
- The archived README labels this a working candidate. These notes describe its retained source rather than claim an unrecorded production rollout.

[Source](https://github.com/thegarty/allauth-sdk/tree/v1.3.5/packages/react) · [Archive](https://allauth.co/sdk/allauth-react-1.3.5.tgz) · [Release record](https://allauth.co/releases/sdk-1-3-5)

SHA-256: `0c52ada46541df38650ad2265c415035ba2af6b0f3a8f4c27c5f633a21735afe`

## 1.3.4

Preserves local return destinations through native sign-in, signup and multi-factor continuation.

Publication date: unknown; reconstructed from retained archives.

- Exports safeAuthReturnTo, resolveAuthReturnTo, withAuthReturnTo and useAuthReturnTo helpers for bounded local destinations.
- SignIn and SignUp preserve validated returnTo values through links and callbacks, while explicit component destinations take precedence.
- Rejects external, API/proxy and encoded-alias destinations and validates callbackUrl on full-page native MFA continuations.

[Source](https://github.com/thegarty/allauth-sdk/tree/v1.3.4/packages/react) · [Archive](https://allauth.co/sdk/allauth-react-1.3.4.tgz) · [Release record](https://allauth.co/releases/sdk-1-3-4)

SHA-256: `ead480cbdcc502e29c78a26bc849845478e7de3bd8a9369b546cbbb3008998a5`

## 1.3.3

Corrects account-panel visibility and tab overflow styling.

Publication date: unknown; reconstructed from retained archives.

- Forces hidden elements inside the SDK scope to remain hidden when host styles would otherwise affect their display.
- Constrains account-tab vertical overflow and moves keyboard focus outlines inside the tab viewport.

[Source](https://github.com/thegarty/allauth-sdk/tree/v1.3.3/packages/react) · [Archive](https://allauth.co/sdk/allauth-react-1.3.3.tgz) · [Release record](https://allauth.co/releases/sdk-1-3-3)

SHA-256: `b91b9f666fa6338a5c44a5569f0abfe7b8b177cf7dcd591c7ba3ff60f5f90547`

## 1.3.2

Scopes device-list row styling more specifically to the AllAuth widget.

Publication date: unknown; reconstructed from retained archives.

- Changes the device-list row selector to include the AllAuth root, strengthening its padding, border and corner styles against host selectors.
- The archive comparison contains a focused stylesheet change; authentication and account logic are unchanged in this patch.

[Source](https://github.com/thegarty/allauth-sdk/tree/v1.3.2/packages/react) · [Archive](https://allauth.co/sdk/allauth-react-1.3.2.tgz) · [Release record](https://allauth.co/releases/sdk-1-3-2)

SHA-256: `04b86edb8a2169a7f38bd158be578c97e475c71e9d5792dfcceb8ae79ecbfd06`

## 1.3.1

Preserves invitation intent in AccountSettings and verifies fresh membership before application callbacks.

Publication date: unknown; reconstructed from retained archives.

- Accepts an optional invitationId or a validated invitation query on the account page.
- Keeps invitation acceptance explicit for the verified invited address and checks membership, active organisation and session before selection callbacks.
- Supports retrying failed host setup without accepting an invitation twice, and opening an existing workspace from a closed invitation.

[Source](https://github.com/thegarty/allauth-sdk/tree/v1.3.1/packages/react) · [Archive](https://allauth.co/sdk/allauth-react-1.3.1.tgz) · [Release record](https://allauth.co/releases/sdk-1-3-1)

SHA-256: `ec1128184ff7ce13478d3cccad75e8258032b025ca16070c6af806b9a02c3f88`

## 1.3.0

Adds a portable AccountSettings surface with profile, security and organisation tabs.

Publication date: unknown; reconstructed from retained archives.

- Adds AccountSettings and shared native profile panels, including optional profile-image upload drafts applied only on explicit profile save.
- Keeps modal headers and navigation fixed while their main content scrolls.
- Checks browser passkey support and presents native cancellation, recent-login and expired-challenge errors.
- Refines organisation member controls and protects the last owner from invalid changes in the interface.

[Source](https://github.com/thegarty/allauth-sdk/tree/v1.3.0/packages/react) · [Archive](https://allauth.co/sdk/allauth-react-1.3.0.tgz) · [Release record](https://allauth.co/releases/sdk-1-3-0)

SHA-256: `96fafbcfaa6991cf4abe60c4e986bdaf6c6b199b17754152aeee8e8f38bd2a15`

## 1.2.2

Repositions compact account and organisation menus when their anchors or contents resize.

Publication date: unknown; reconstructed from retained archives.

- Observes the menu, anchor and document viewport so asynchronously loaded session or organisation content can trigger a position update.
- Coalesces layout updates with requestAnimationFrame and disconnects observers and pending frames when the menu closes.

[Source](https://github.com/thegarty/allauth-sdk/tree/v1.2.2/packages/react) · [Archive](https://allauth.co/sdk/allauth-react-1.2.2.tgz) · [Release record](https://allauth.co/releases/sdk-1-2-2)

SHA-256: `cd37becdc4cb07a3f49fcd19b82108cc44abede69cf2d600b4d6b42a6fc1f7f7`

## 1.2.1

Corrects menu overflow measurements and positioning near viewport edges.

Publication date: unknown; reconstructed from retained archives.

- Measures against document viewport width and updates left/right placement rather than retaining a translated overflow box.
- Recomputes compact menu placement when the window resizes, maintaining a viewport margin.

[Source](https://github.com/thegarty/allauth-sdk/tree/v1.2.1/packages/react) · [Archive](https://allauth.co/sdk/allauth-react-1.2.1.tgz) · [Release record](https://allauth.co/releases/sdk-1-2-1)

SHA-256: `88a0b9778d0452ed944a5d7eb7546e5b3156fdd756dc815b775c3c560f34bfb6`

## 1.2.0

Adds opt-in avatar menus, a compact organisation switcher and shared native management dialogs.

Publication date: unknown; reconstructed from retained archives.

- Adds avatar UserButton and compact OrganizationSwitcher variants with opt-in modal management while retaining existing page/card defaults.
- Introduces controlled UserProfileModal and OrganizationProfileModal components and embedded profile/member views.
- Adds organisation selection and creation callbacks, awaiting application setup and retaining visible retry states on callback failure.

[Source](https://github.com/thegarty/allauth-sdk/tree/v1.2.0/packages/react) · [Archive](https://allauth.co/sdk/allauth-react-1.2.0.tgz) · [Release record](https://allauth.co/releases/sdk-1-2-0)

SHA-256: `17a6eeea44d62dab4f044744ee612f24fc39cd9434b36215d97fcfdf88753919`

## 1.1.1

Adds the AllAuth wordmark to the native authentication footer attribution.

Publication date: unknown; reconstructed from retained archives.

- Packages a reusable wordmark component and updates the secured-by footer to use the branded mark with an accessible label.
- Updates the corresponding attribution styling and embedding guide without changing the authentication client or proxy.

[Source](https://github.com/thegarty/allauth-sdk/tree/v1.1.1/packages/react) · [Archive](https://allauth.co/sdk/allauth-react-1.1.1.tgz) · [Release record](https://allauth.co/releases/sdk-1-1-1)

SHA-256: `cef12ffa90749174354d0ecc32c736a0e1728d86355506070ebe140bc1ec7973`

## 1.1.0

Adds centrally managed application branding and refines the portable authentication forms.

Publication date: unknown; reconstructed from retained archives.

- Loads and validates public application branding, including names, logos, support email, colours and attribution, through the same-origin SDK configuration endpoint.
- Adds branding overrides and shared authentication headers and footers to the portable sign-in, signup and password recovery forms.
- Refines email-first password sign-in presentation and packages a Google icon while retaining the existing client and server proxy.

[Source](https://github.com/thegarty/allauth-sdk/tree/v1.1.0/packages/react) · [Archive](https://allauth.co/sdk/allauth-react-1.1.0.tgz) · [Release record](https://allauth.co/releases/sdk-1-1-0)

SHA-256: `5bb320f6292e00866ce205dea22a79197675066919e1fcf2c5ebe1e61f63cc67`

## 1.0.0

The earliest retained public archive contains cookie-based React authentication, account and organisation components, and an app-bound server proxy.

Publication date: unknown; reconstructed from retained archives.

- Includes AllAuthProvider, SignIn, SignUp, password recovery, UserButton, UserProfile and OrganizationSwitcher backed by native cookie sessions.
- Provides inline multi-factor continuation and account security controls without exposing session credentials to browser code.
- Packages the optional Better Auth UI provider integration and a server-only same-origin Next.js proxy; the portable React components do not require Next.js.

[Source](https://github.com/thegarty/allauth-sdk/tree/v1.0.0/packages/react) · [Archive](https://allauth.co/sdk/allauth-react-1.0.0.tgz) · [Release record](https://allauth.co/releases/sdk-1-0-0)

SHA-256: `cebcfc1216e7cfd34c032001f7ba891a49865f9596a03eafbec94adc9f0e2e75`
