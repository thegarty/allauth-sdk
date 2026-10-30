"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useState,
} from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { createAllAuthClient } from "./client";
import type { AllAuthClient } from "./client";
import {
	appCallback,
	appPath,
	authError,
	proxyBasePath,
	safeSessionResponse,
} from "./helpers";
import type { SafeSession } from "./helpers";

export type AllAuthCapabilities = {
	emailPassword: boolean;
	google: boolean;
	organizations: boolean;
	twoFactor: boolean;
};
export type AllAuthProviderProps = {
	children: ReactNode;
	basePath?: string;
	signInUrl?: string;
	afterSignInUrl?: string;
	afterSignUpUrl?: string;
	profileUrl?: string;
	capabilities?: AllAuthCapabilities;
};

type AllAuthContextValue = {
	client: AllAuthClient;
	basePath: string;
	signInUrl: string;
	afterSignInUrl: string;
	afterSignUpUrl: string;
	profileUrl: string;
	capabilities: AllAuthCapabilities | null;
	configError: string;
	reloadConfig: () => void;
	challenge: boolean;
	challengeMethods?: string[];
	setChallenge: (value: boolean) => void;
};
const AllAuthContext = createContext<AllAuthContextValue | null>(null);

/** Share one cookie-based client across the embedding app's account components. */
export function AllAuthProvider({
	children,
	basePath = "/api/allauth",
	signInUrl = "/sign-in",
	afterSignInUrl = "/",
	afterSignUpUrl = "/",
	profileUrl = "/account",
	capabilities: configured,
}: AllAuthProviderProps) {
	const path = proxyBasePath(basePath);
	const [challenge, setChallenge] = useState(false);
	const [challengeMethods, setChallengeMethods] = useState<
		string[] | undefined
	>();
	const [capabilities, setCapabilities] = useState<AllAuthCapabilities | null>(
		configured ?? null,
	);
	const [configError, setConfigError] = useState("");
	const [configVersion, setConfigVersion] = useState(0);
	const client = useMemo(
		() =>
			createAllAuthClient(path, (methods) => {
				setChallengeMethods(methods);
				setChallenge(true);
			}),
		[path],
	);
	useEffect(() => {
		setChallenge(
			new URLSearchParams(window.location.search).get("challenge") ===
				"two-factor",
		);
	}, []);
	useEffect(() => {
		if (configured) {
			setCapabilities(configured);
			setConfigError("");
			return;
		}
		const controller = new AbortController();
		setCapabilities(null);
		setConfigError("");
		fetch(`${path}/sdk/config`, {
			credentials: "same-origin",
			cache: "no-store",
			signal: controller.signal,
		})
			.then(async (response) => {
				if (!response.ok)
					throw new Error("Sign-in options could not be loaded.");
				const data: unknown = await response.json();
				if (
					!data ||
					typeof data !== "object" ||
					!["emailPassword", "google", "organizations", "twoFactor"].every(
						(key) =>
							key in data &&
							typeof (data as Record<string, unknown>)[key] === "boolean",
					)
				)
					throw new Error("Sign-in options could not be loaded.");
				const flags = data as AllAuthCapabilities;
				setCapabilities({
					emailPassword: flags.emailPassword,
					google: flags.google,
					organizations: flags.organizations,
					twoFactor: flags.twoFactor,
				});
			})
			.catch((error: unknown) => {
				if (!controller.signal.aborted) setConfigError(authError(error));
			});
		return () => controller.abort();
	}, [path, configured, configVersion]);
	const value = {
		client,
		basePath: path,
		signInUrl: appPath(signInUrl),
		afterSignInUrl: appPath(afterSignInUrl),
		afterSignUpUrl: appPath(afterSignUpUrl),
		profileUrl: appPath(profileUrl),
		capabilities,
		configError,
		reloadConfig: () => setConfigVersion((version) => version + 1),
		challenge,
		challengeMethods,
		setChallenge,
	};
	return (
		<AllAuthContext.Provider value={value}>{children}</AllAuthContext.Provider>
	);
}

/** Access the native client and public configuration without browser credentials. */
export function useAllAuth() {
	const context = useContext(AllAuthContext);
	if (!context)
		throw new Error("AllAuth components must be inside AllAuthProvider.");
	return context;
}

/** Request recovery using the application's own email callback route. */
export function ForgotPassword({ className = "", style, resetPasswordUrl = "/reset-password", signInUrl }: Appearance & { resetPasswordUrl?: string; signInUrl?: string }) {
	const { client, signInUrl: configuredSignIn } = useAllAuth();
	const id = useId();
	const [email, setEmail] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const submit = async (event: FormEvent) => {
		event.preventDefault(); setBusy(true); setError(""); setMessage("");
		try {
			const result = await client.requestPasswordReset({ email: email.trim(), redirectTo: appCallback(resetPasswordUrl, window.location.origin) });
			if (result.error) throw result.error;
			setMessage("If this account supports password recovery, check your inbox for a reset link.");
		} catch (cause) { setError(authError(cause)); } finally { setBusy(false); }
	};
	return <section className={`allauth allauth-card ${className}`} style={style} aria-label="Password recovery"><form className="allauth-stack" onSubmit={submit}><h2>Reset your password</h2><Notice message={error} error /><Notice message={message} /><Field label="Email address" id={id}><input id={id} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} /></Field><button type="submit" disabled={busy}>{busy ? "Requesting…" : "Send reset link"}</button><a href={appPath(signInUrl ?? configuredSignIn)}>Back to sign in</a></form></section>;
}

/** Consume the native reset token supplied by the mailed callback. */
export function ResetPassword({ className = "", style, token, signInUrl }: Appearance & { token?: string; signInUrl?: string }) {
	const { client, signInUrl: configuredSignIn } = useAllAuth();
	const id = useId();
	const [password, setPassword] = useState("");
	const [confirmation, setConfirmation] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [done, setDone] = useState(false);
	const submit = async (event: FormEvent) => {
		event.preventDefault(); setError("");
		if (password !== confirmation) { setError("The passwords must match."); return; }
		const resetToken = token || new URLSearchParams(window.location.search).get("token");
		if (!resetToken) { setError("Open the reset link from your email."); return; }
		setBusy(true);
		try { const result = await client.resetPassword({ token: resetToken, newPassword: password }); if (result.error) throw result.error; setPassword(""); setConfirmation(""); setDone(true); }
		catch (cause) { setError(authError(cause)); } finally { setBusy(false); }
	};
	return <section className={`allauth allauth-card ${className}`} style={style} aria-label="New password"><form className="allauth-stack" onSubmit={submit}><h2>Choose a new password</h2><Notice message={error} error />{done ? <Notice message="Password changed. Sign in with your new password." /> : <><Field label="New password" id={`${id}-password`}><input id={`${id}-password`} type="password" minLength={12} maxLength={128} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} /></Field><Field label="Confirm password" id={`${id}-confirm`}><input id={`${id}-confirm`} type="password" minLength={12} maxLength={128} required autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} /></Field><button type="submit" disabled={busy}>{busy ? "Saving…" : "Change password"}</button></>}<a href={appPath(signInUrl ?? configuredSignIn)}>Back to sign in</a></form></section>;
}

function SecuritySettings({ user }: { user: { id: string; twoFactorEnabled?: boolean | null } }) {
	const { client, capabilities } = useAllAuth();
	const id = useId();
	const [password, setPassword] = useState("");
	const [code, setCode] = useState("");
	const [setup, setSetup] = useState<{ totpURI: string; backupCodes: string[] }>();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const passkeys = client.useListPasskeys();
	const run = async (action: () => Promise<void>) => { setBusy(true); setError(""); setMessage(""); try { await action(); } catch (cause) { setError(authError(cause)); } finally { setPassword(""); setBusy(false); } };
	const begin = (event: FormEvent) => { event.preventDefault(); void run(async () => { const result = await client.twoFactor.enable(password ? { password } : {}); if (result.error) throw result.error; if (!result.data || result.data.method !== "totp" || !result.data.totpURI || !result.data.backupCodes) throw new Error("Authenticator setup is unavailable."); setSetup(result.data); }); };
	const verify = (event: FormEvent) => { event.preventDefault(); void run(async () => { const result = await client.twoFactor.verifyTotp({ code: code.trim(), trustDevice: false }); if (result.error) throw result.error; setCode(""); setSetup(undefined); setMessage("Two-factor authentication enabled. Keep your backup codes in a safe place."); await client.getSession(); }); };
	return <div className="allauth-stack"><Notice message={error} error /><Notice message={message} />{capabilities?.twoFactor && <details><summary>Two-factor authentication {user.twoFactorEnabled ? "· Enabled" : "· Not enabled"}</summary><div className="allauth-stack">{setup ? <><p>Add this account to your authenticator before verifying the first code. Save the backup codes before continuing.</p><Field label="Authenticator setup URI" id={`${id}-uri`}><input id={`${id}-uri`} value={setup.totpURI} readOnly /></Field><Field label="Manual setup key" id={`${id}-secret`}><input id={`${id}-secret`} value={new URL(setup.totpURI).searchParams.get("secret") || ""} readOnly /></Field><pre style={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{setup.backupCodes.join("\n")}</pre><form className="allauth-stack" onSubmit={verify}><Field label="Authenticator code" id={`${id}-code`}><input id={`${id}-code`} value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" required disabled={busy} /></Field><button type="submit" disabled={busy}>Verify and enable</button></form></> : <form className="allauth-stack" onSubmit={user.twoFactorEnabled ? (event) => { event.preventDefault(); void run(async () => { const result = await client.twoFactor.disable(password ? { password } : {}); if (result.error) throw result.error; setMessage("Two-factor authentication disabled."); await client.getSession(); }); } : begin}><Field label="Current password (if you have one)" id={`${id}-factor-password`}><input id={`${id}-factor-password`} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} /></Field><button type="submit" disabled={busy}>{user.twoFactorEnabled ? "Disable two-factor authentication" : "Set up authenticator"}</button></form>}</div></details>}<details><summary>Passkeys</summary><div className="allauth-stack"><p className="allauth-muted">Use a device or security key supported by your browser.</p><button type="button" disabled={busy} onClick={() => void run(async () => { const result = await client.passkey.addPasskey({ name: "My passkey" }); if (result.error) throw result.error; setMessage("Passkey added."); await passkeys.refetch(); })}>Add a passkey</button>{passkeys.isPending ? <Loading /> : passkeys.error ? <Notice message={authError(passkeys.error)} error /> : passkeys.data?.map((passkey) => <div key={passkey.id} className="allauth-inline"><span>{passkey.name || "Passkey"}</span><button type="button" className="allauth-secondary" disabled={busy} onClick={() => void run(async () => { const result = await client.passkey.deletePasskey({ id: passkey.id }); if (result.error) throw result.error; setMessage("Passkey removed."); await passkeys.refetch(); })}>Remove</button></div>)}</div></details></div>;
}

type Appearance = { className?: string; style?: CSSProperties };
type AuthAppearance = Appearance & {
	afterSignInUrl?: string;
	afterSignUpUrl?: string;
	signInUrl?: string;
	signUpUrl?: string;
	forgotPasswordUrl?: string;
};

function Notice({
	message,
	error = false,
}: {
	message: string;
	error?: boolean;
}) {
	return message ? (
		<p
			className={error ? "allauth-error" : "allauth-notice"}
			role={error ? "alert" : "status"}
		>
			{message}
		</p>
	) : null;
}
function Loading({ children = "Loading…" }: { children?: ReactNode }) {
	return (
		<p role="status" className="allauth-muted">
			{children}
		</p>
	);
}
function Field({
	label,
	children,
	id,
}: {
	label: string;
	children: ReactNode;
	id: string;
}) {
	return (
		<div className="allauth-field">
			<label htmlFor={id}>{label}</label>
			{children}
		</div>
	);
}
function ConfigState() {
	const { configError, reloadConfig } = useAllAuth();
	return configError ? (
		<>
			<Notice message={configError} error />
			<button
				type="button"
				className="allauth-secondary"
				onClick={reloadConfig}
			>
				Try again
			</button>
		</>
	) : (
		<Loading>Loading sign-in options…</Loading>
	);
}

function TwoFactorChallenge({ afterSignInUrl }: { afterSignInUrl: string }) {
	const { client, challengeMethods, setChallenge } = useAllAuth();
	const id = useId();
	const [backup, setBackup] = useState(false);
	const [code, setCode] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const totpAvailable =
		!challengeMethods?.length || challengeMethods.includes("totp");
	async function verify(event: FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			const response = backup
				? await client.twoFactor.verifyBackupCode({
						code: code.trim(),
						trustDevice: false,
					})
				: await client.twoFactor.verifyTotp({
						code: code.trim(),
						trustDevice: false,
					});
			if (response.error) throw response.error;
			setCode("");
			setChallenge(false);
			window.location.assign(appPath(afterSignInUrl));
		} catch (error) {
			setError(authError(error));
		} finally {
			setBusy(false);
		}
	}
	return (
		<div className="allauth-stack">
			<h2>Verify your sign-in</h2>
			<p className="allauth-muted">
				{backup
					? "Enter one unused backup code."
					: "Enter the code from your authenticator app."}
			</p>
			<Notice message={error} error />
			{totpAvailable || backup ? (
				<form className="allauth-stack" onSubmit={verify}>
					<Field label={backup ? "Backup code" : "Authentication code"} id={id}>
						<input
							id={id}
							value={code}
							onChange={(event) => setCode(event.target.value)}
							required
							autoComplete="one-time-code"
							inputMode={backup ? "text" : "numeric"}
							maxLength={backup ? 128 : 8}
							pattern={backup ? undefined : "[0-9]{6,8}"}
							disabled={busy}
						/>
					</Field>
					<button type="submit" disabled={busy}>
						{busy ? "Verifying…" : "Verify"}
					</button>
				</form>
			) : (
				<Notice message="Use a backup code to complete this sign-in." />
			)}
			<button
				type="button"
				className="allauth-secondary"
				disabled={busy}
				onClick={() => {
					setBackup(!backup);
					setCode("");
					setError("");
				}}
			>
				{backup ? "Use authenticator code" : "Use a backup code"}
			</button>
		</div>
	);
}

/** Inline password sign-in, the AllAuth social broker, and MFA challenges. */
export function SignIn({
	className = "",
	style,
	afterSignInUrl: target,
	signUpUrl,
	forgotPasswordUrl,
}: AuthAppearance) {
	const context = useAllAuth();
	const { client, capabilities, challenge } = context;
	const targetPath = appPath(target ?? context.afterSignInUrl);
	const id = useId();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function signIn(event: FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			const response = await client.signIn.email({
				email: email.trim(),
				password,
				callbackURL: appCallback(targetPath, window.location.origin),
			});
			if (response.error) throw response.error;
			setPassword("");
			if (
				response.data &&
				"twoFactorRedirect" in response.data &&
				response.data.twoFactorRedirect
			)
				return;
			window.location.assign(targetPath);
		} catch (error) {
			setError(authError(error));
		} finally {
			setBusy(false);
		}
	}
	async function google() {
		setBusy(true);
		setError("");
		try {
			const response = await client.signIn.social({
				provider: "allauth",
				callbackURL: appCallback(targetPath, window.location.origin),
			});
			if (response.error) throw response.error;
		} catch (error) {
			setError(authError(error));
			setBusy(false);
		}
	}
	return (
		<section
			className={`allauth allauth-card ${className}`}
			style={style}
			aria-label="Sign in"
		>
			{challenge ? (
				<TwoFactorChallenge afterSignInUrl={targetPath} />
			) : (
				<div className="allauth-stack">
					<h2>Sign in</h2>
					<Notice message={error} error />
					{!capabilities ? (
						<ConfigState />
					) : (
						<>
							{capabilities.google && (
								<button
									type="button"
									className="allauth-secondary"
									disabled={busy}
									onClick={() => void google()}
								>
									{busy ? "Connecting…" : "Continue with Google"}
								</button>
							)}
							{capabilities.emailPassword && (
								<form className="allauth-stack" onSubmit={signIn}>
									<Field label="Email address" id={`${id}-email`}>
										<input
											id={`${id}-email`}
											type="email"
											autoComplete="username"
											required
											value={email}
											onChange={(event) => setEmail(event.target.value)}
											disabled={busy}
										/>
									</Field>
									<Field label="Password" id={`${id}-password`}>
										<input
											id={`${id}-password`}
											type="password"
											autoComplete="current-password"
											required
											value={password}
											onChange={(event) => setPassword(event.target.value)}
											disabled={busy}
										/>
									</Field>
									<button type="submit" disabled={busy}>
										{busy ? "Signing in…" : "Sign in"}
									</button>
								</form>
							)}
							{!capabilities.emailPassword && !capabilities.google && (
								<Notice message="No sign-in methods are enabled for this app." />
							)}
						</>
					)}
					{forgotPasswordUrl && (
						<a href={appPath(forgotPasswordUrl)}>Forgot your password?</a>
					)}
					{signUpUrl && (
						<p className="allauth-muted">
							New here? <a href={appPath(signUpUrl)}>Create an account</a>
						</p>
					)}
				</div>
			)}
		</section>
	);
}

/** Create a real account in the app's selected AllAuth project. */
export function SignUp({
	className = "",
	style,
	afterSignUpUrl: target,
	signInUrl: signInPath,
}: AuthAppearance) {
	const context = useAllAuth();
	const { client, capabilities } = context;
	const targetPath = appPath(target ?? context.afterSignUpUrl);
	const id = useId();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	async function submit(event: FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError("");
		setMessage("");
		try {
			const response = await client.signUp.email({
				name: name.trim(),
				email: email.trim(),
				password,
				callbackURL: appCallback(targetPath, window.location.origin),
			});
			if (response.error) throw response.error;
			setPassword("");
			const session = await client.getSession();
			if (session.error) throw session.error;
			if (session.data) window.location.assign(targetPath);
			else
				setMessage(
					"Account created. Check your email to verify your address, then sign in.",
				);
		} catch (error) {
			setError(authError(error));
		} finally {
			setBusy(false);
		}
	}
	async function google() {
		setBusy(true);
		setError("");
		try {
			const response = await client.signIn.social({
				provider: "allauth",
				callbackURL: appCallback(targetPath, window.location.origin),
				newUserCallbackURL: appCallback(targetPath, window.location.origin),
			});
			if (response.error) throw response.error;
		} catch (error) {
			setError(authError(error));
			setBusy(false);
		}
	}
	return (
		<section
			className={`allauth allauth-card ${className}`}
			style={style}
			aria-label="Create an account"
		>
			<div className="allauth-stack">
				<h2>Create an account</h2>
				<Notice message={error} error />
				<Notice message={message} />
				{!capabilities ? (
					<ConfigState />
				) : (
					<>
						{capabilities.google && (
							<button
								type="button"
								className="allauth-secondary"
								disabled={busy}
								onClick={() => void google()}
							>
								{busy ? "Connecting…" : "Continue with Google"}
							</button>
						)}
						{capabilities.emailPassword && !message && (
							<form className="allauth-stack" onSubmit={submit}>
								<Field label="Name" id={`${id}-name`}>
									<input
										id={`${id}-name`}
										autoComplete="name"
										required
										maxLength={200}
										value={name}
										onChange={(event) => setName(event.target.value)}
										disabled={busy}
									/>
								</Field>
								<Field label="Email address" id={`${id}-email`}>
									<input
										id={`${id}-email`}
										type="email"
										autoComplete="email"
										required
										value={email}
										onChange={(event) => setEmail(event.target.value)}
										disabled={busy}
									/>
								</Field>
								<Field label="Password" id={`${id}-password`}>
									<input
										id={`${id}-password`}
										type="password"
										autoComplete="new-password"
										required
										minLength={8}
										maxLength={128}
										value={password}
										onChange={(event) => setPassword(event.target.value)}
										disabled={busy}
									/>
								</Field>
								<button type="submit" disabled={busy}>
									{busy ? "Creating account…" : "Create account"}
								</button>
							</form>
						)}
						{!capabilities.emailPassword && !capabilities.google && (
							<Notice message="Account creation is not enabled for this app." />
						)}
					</>
				)}
				<p className="allauth-muted">
					Already have an account?{" "}
					<a href={appPath(signInPath ?? context.signInUrl)}>Sign in</a>
				</p>
			</div>
		</section>
	);
}

/** Show the current account and sign out without exposing session credentials. */
export function UserButton({
	className = "",
	style,
	signInUrl,
	profileUrl,
	afterSignOutUrl = "/",
}: Appearance & {
	signInUrl?: string;
	profileUrl?: string;
	afterSignOutUrl?: string;
}) {
	const context = useAllAuth();
	const session = context.client.useSession();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function signOut() {
		setBusy(true);
		setError("");
		try {
			const response = await context.client.signOut();
			if (response.error) throw response.error;
			window.location.assign(appPath(afterSignOutUrl));
		} catch (error) {
			setError(authError(error));
			setBusy(false);
		}
	}
	return (
		<div className={`allauth ${className}`} style={style}>
			{session.isPending ? (
				<Loading />
			) : session.error ? (
				<Notice message={authError(session.error)} error />
			) : !session.data ? (
				<a
					className="allauth-link-button"
					href={appPath(signInUrl ?? context.signInUrl)}
				>
					Sign in
				</a>
			) : (
				<details className="allauth-user-menu">
					<summary>{session.data.user.name || session.data.user.email}</summary>
					<div className="allauth-menu-content">
						<p className="allauth-muted">{session.data.user.email}</p>
						<a href={appPath(profileUrl ?? context.profileUrl)}>
							Manage account
						</a>
						<button
							type="button"
							className="allauth-secondary"
							disabled={busy}
							onClick={() => void signOut()}
						>
							{busy ? "Signing out…" : "Sign out"}
						</button>
						<Notice message={error} error />
					</div>
				</details>
			)}
		</div>
	);
}

function Sessions({ signInUrl }: { signInUrl: string }) {
	const { basePath, client } = useAllAuth();
	const [sessions, setSessions] = useState<SafeSession[]>([]);
	const [currentId, setCurrentId] = useState<string | undefined>();
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [selected, setSelected] = useState<SafeSession | null>(null);
	const load = useCallback(
		async (signal?: AbortSignal) => {
			setLoading(true);
			setError("");
			try {
				const response = await fetch(`${basePath}/sdk/sessions`, {
					cache: "no-store",
					credentials: "same-origin",
					signal,
				});
				if (!response.ok)
					throw new Error("Your signed-in devices could not be loaded.");
				const data = safeSessionResponse(await response.json());
				if (!signal?.aborted) {
					setSessions(data.sessions);
					setCurrentId(data.currentSessionId);
				}
			} catch (error) {
				if (!signal?.aborted) setError(authError(error));
			} finally {
				if (!signal?.aborted) setLoading(false);
			}
		},
		[basePath],
	);
	useEffect(() => {
		const controller = new AbortController();
		void load(controller.signal);
		return () => controller.abort();
	}, [load]);
	async function revoke() {
		if (!selected) return;
		setBusy(true);
		setError("");
		try {
			const response = await fetch(`${basePath}/sdk/sessions/revoke`, {
				method: "POST",
				cache: "no-store",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: selected.id }),
			});
			const result: unknown = await response.json();
			if (
				!response.ok ||
				!result ||
				typeof result !== "object" ||
				!("success" in result) ||
				result.success !== true
			)
				throw new Error("This session could not be ended.");
			if (selected.id === currentId) {
				await client.getSession();
				window.location.assign(appPath(signInUrl));
				return;
			}
			setSelected(null);
			await load();
		} catch (error) {
			setError(authError(error));
		} finally {
			setBusy(false);
		}
	}
	return (
		<section className="allauth-stack">
			<div className="allauth-row">
				<h3>Signed-in devices</h3>
				<button
					type="button"
					className="allauth-secondary"
					disabled={loading || busy}
					onClick={() => void load()}
				>
					Refresh
				</button>
			</div>
			<Notice message={error} error />
			{loading ? (
				<Loading />
			) : sessions.length ? (
				<ul className="allauth-list">
					{sessions.map((session) => (
						<li key={session.id}>
							<div>
								<strong>
									{session.id === currentId
										? "This session"
										: "Signed-in device"}
								</strong>
								<p className="allauth-muted">
									{session.userAgent || "Device details unavailable"}
								</p>
								{session.ipAddress && (
									<p className="allauth-muted">{session.ipAddress}</p>
								)}
								<p className="allauth-muted">
									Signed in {new Date(session.createdAt).toLocaleString()}
								</p>
							</div>
							<button
								type="button"
								className="allauth-secondary"
								disabled={busy}
								onClick={() => setSelected(session)}
							>
								End session
							</button>
						</li>
					))}
				</ul>
			) : (
				!error && <p className="allauth-muted">No active sessions.</p>
			)}
			{selected && (
				<div
					className="allauth-confirm"
					role="group"
					aria-label="Confirm ending session"
				>
					<p>
						{selected.id === currentId
							? "End this session and sign out?"
							: "End this device's session?"}
					</p>
					<div className="allauth-row">
						<button type="button" disabled={busy} onClick={() => void revoke()}>
							{busy ? "Ending…" : "End session"}
						</button>
						<button
							type="button"
							className="allauth-secondary"
							disabled={busy}
							onClick={() => setSelected(null)}
						>
							Cancel
						</button>
					</div>
				</div>
			)}
		</section>
	);
}

function ProfileForms({
	user,
}: {
	user: { name: string; email: string; emailVerified: boolean };
}) {
	const { client, afterSignInUrl } = useAllAuth();
	const id = useId();
	const [name, setName] = useState(user.name);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	async function run(
		action: () => Promise<{ error: unknown }>,
		message: string,
	) {
		setBusy(true);
		setError("");
		setMessage("");
		try {
			const response = await action();
			if (response.error) throw response.error;
			setMessage(message);
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (error) {
			setError(authError(error));
		} finally {
			setBusy(false);
		}
	}
	return (
		<>
			<Notice message={error} error />
			<Notice message={message} />
			<form
				className="allauth-stack"
				onSubmit={(event) => {
					event.preventDefault();
					void run(
						() => client.updateUser({ name: name.trim() }),
						"Profile updated.",
					);
				}}
			>
				<h3>Profile</h3>
				<Field label="Name" id={`${id}-name`}>
					<input
						id={`${id}-name`}
						required
						maxLength={200}
						autoComplete="name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						disabled={busy}
					/>
				</Field>
				<p>
					{user.email}{" "}
					<span className="allauth-muted">
						{user.emailVerified ? "Verified" : "Unverified"}
					</span>
				</p>
				{!user.emailVerified && (
					<button
						type="button"
						className="allauth-secondary"
						disabled={busy}
						onClick={() =>
							void run(
								() =>
									client.sendVerificationEmail({
										email: user.email,
										callbackURL: appCallback(
											afterSignInUrl,
											window.location.origin,
										),
									}),
								"Verification email requested. Check your inbox.",
							)
						}
					>
						Verify email address
					</button>
				)}
				<button type="submit" disabled={busy}>
					{busy ? "Saving…" : "Save profile"}
				</button>
			</form>
			<form
				className="allauth-stack"
				onSubmit={(event) => {
					event.preventDefault();
					if (newPassword !== confirmPassword) {
						setError("New passwords must match.");
						return;
					}
					void run(
						() =>
							client.changePassword({
								currentPassword,
								newPassword,
								revokeOtherSessions: true,
							}),
						"Password changed. Other sessions have been ended.",
					);
				}}
			>
				<h3>Change password</h3>
				<Field label="Current password" id={`${id}-current`}>
					<input
						id={`${id}-current`}
						type="password"
						required
						autoComplete="current-password"
						value={currentPassword}
						onChange={(event) => setCurrentPassword(event.target.value)}
						disabled={busy}
					/>
				</Field>
				<Field label="New password" id={`${id}-new`}>
					<input
						id={`${id}-new`}
						type="password"
						required
						minLength={12}
						maxLength={128}
						autoComplete="new-password"
						value={newPassword}
						onChange={(event) => setNewPassword(event.target.value)}
						disabled={busy}
					/>
				</Field>
				<Field label="Confirm new password" id={`${id}-confirm`}>
					<input
						id={`${id}-confirm`}
						type="password"
						required
						minLength={12}
						maxLength={128}
						autoComplete="new-password"
						value={confirmPassword}
						onChange={(event) => setConfirmPassword(event.target.value)}
						disabled={busy}
					/>
				</Field>
				<button type="submit" disabled={busy}>
					{busy ? "Saving…" : "Change password"}
				</button>
			</form>
		</>
	);
}

/** Profile, verification, password changes, and a credential-free device list. */
export function UserProfile({
	className = "",
	style,
	signInUrl,
}: Appearance & { signInUrl?: string }) {
	const context = useAllAuth();
	const session = context.client.useSession();
	const signInPath = appPath(signInUrl ?? context.signInUrl);
	return (
		<section
			className={`allauth allauth-card ${className}`}
			style={style}
			aria-label="Account profile"
		>
			<div className="allauth-stack">
				<h2>Your account</h2>
				{session.isPending ? (
					<Loading />
				) : session.error ? (
					<Notice message={authError(session.error)} error />
				) : !session.data ? (
					<p>
						<a href={signInPath}>Sign in</a> to manage your account.
					</p>
				) : (
					<>
						<ProfileForms key={session.data.user.id} user={session.data.user} />
						<SecuritySettings user={session.data.user} />
						<Sessions signInUrl={signInPath} />
					</>
				)}
			</div>
		</section>
	);
}

type Invitation = {
	id: string;
	organizationName: string;
	role: string;
	status: string;
};

function InviteMember({
	organizationId,
	disabled,
}: {
	organizationId: string;
	disabled: boolean;
}) {
	const { client } = useAllAuth();
	const role = client.useActiveMemberRole();
	const id = useId();
	const [email, setEmail] = useState("");
	const [memberRole, setMemberRole] = useState<"member" | "admin">("member");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	if (role.isPending)
		return <Loading>Loading organization permissions…</Loading>;
	if (role.error) return <Notice message={authError(role.error)} error />;
	if (
		!role.data?.role
			.split(",")
			.some((value) => ["owner", "admin"].includes(value.trim()))
	)
		return null;
	async function invite(event: FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError("");
		setMessage("");
		try {
			const response = await client.organization.inviteMember({
				organizationId,
				email: email.trim(),
				role: memberRole,
			});
			if (response.error) throw response.error;
			setEmail("");
			setMessage("Invitation sent.");
		} catch (error) {
			setError(authError(error));
		} finally {
			setBusy(false);
		}
	}
	return (
		<details>
			<summary>Invite a member</summary>
			<form className="allauth-stack" onSubmit={invite}>
				<Notice message={error} error />
				<Notice message={message} />
				<Field label="Email address" id={`${id}-email`}>
					<input
						id={`${id}-email`}
						type="email"
						required
						autoComplete="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						disabled={busy || disabled}
					/>
				</Field>
				<Field label="Organization role" id={`${id}-role`}>
					<select
						id={`${id}-role`}
						value={memberRole}
						onChange={(event) =>
							setMemberRole(event.target.value === "admin" ? "admin" : "member")
						}
						disabled={busy || disabled}
					>
						<option value="member">Member</option>
						<option value="admin">Administrator</option>
					</select>
				</Field>
				<button type="submit" disabled={busy || disabled}>
					{busy ? "Sending…" : "Send invitation"}
				</button>
			</form>
		</details>
	);
}

function OrganizationControls({
	hideCreate = false,
}: {
	hideCreate?: boolean;
}) {
	const { client } = useAllAuth();
	const id = useId();
	const organizations = client.useListOrganizations();
	const active = client.useActiveOrganization();
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const [invitations, setInvitations] = useState<Invitation[]>([]);
	const [invitationsLoading, setInvitationsLoading] = useState(true);
	const [invitationsError, setInvitationsError] = useState("");
	const loadInvitations = useCallback(async () => {
		setInvitationsLoading(true);
		setInvitationsError("");
		try {
			const response = await client.organization.listUserInvitations();
			if (response.error) throw response.error;
			setInvitations(response.data ?? []);
		} catch (error) {
			setInvitationsError(authError(error));
		} finally {
			setInvitationsLoading(false);
		}
	}, [client]);
	useEffect(() => {
		void loadInvitations();
	}, [loadInvitations]);
	async function run(
		action: () => Promise<{ error: unknown }>,
		success: string,
	) {
		setBusy(true);
		setError("");
		setMessage("");
		try {
			const response = await action();
			if (response.error) throw response.error;
			setMessage(success);
			await loadInvitations();
		} catch (error) {
			setError(authError(error));
		} finally {
			setBusy(false);
		}
	}
	return (
		<div className="allauth-stack">
			<Notice message={error} error />
			<Notice message={message} />
			{organizations.isPending ? (
				<Loading>Loading organizations…</Loading>
			) : organizations.error ? (
				<Notice message={authError(organizations.error)} error />
			) : (
				<Field label="Active organization" id={`${id}-select`}>
					<select
						id={`${id}-select`}
						value={active.data?.id ?? ""}
						disabled={busy || active.isPending}
						onChange={(event) => {
							const organizationId = event.target.value || null;
							void run(
								() => client.organization.setActive({ organizationId }),
								"Organization selected.",
							);
						}}
					>
						<option value="">Personal account</option>
						{organizations.data?.map((organization) => (
							<option key={organization.id} value={organization.id}>
								{organization.name}
							</option>
						))}
					</select>
				</Field>
			)}
			{active.error && <Notice message={authError(active.error)} error />}
			{active.data && (
				<InviteMember
					key={active.data.id}
					organizationId={active.data.id}
					disabled={busy}
				/>
			)}
			{!hideCreate && (
				<details>
					<summary>Create an organization</summary>
					<form
						className="allauth-stack"
						onSubmit={(event) => {
							event.preventDefault();
							void run(async () => {
								const response = await client.organization.create({
									name: name.trim(),
									slug: slug.trim(),
								});
								if (!response.error) {
									setName("");
									setSlug("");
								}
								return response;
							}, "Organization created.");
						}}
					>
						<Field label="Organization name" id={`${id}-name`}>
							<input
								id={`${id}-name`}
								required
								maxLength={200}
								value={name}
								onChange={(event) => setName(event.target.value)}
								disabled={busy}
							/>
						</Field>
						<Field label="Organization URL name" id={`${id}-slug`}>
							<input
								id={`${id}-slug`}
								required
								pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
								maxLength={100}
								value={slug}
								onChange={(event) => setSlug(event.target.value)}
								disabled={busy}
							/>
						</Field>
						<button type="submit" disabled={busy}>
							{busy ? "Creating…" : "Create organization"}
						</button>
					</form>
				</details>
			)}
			<section className="allauth-stack">
				<div className="allauth-row">
					<h3>Your invitations</h3>
					<button
						type="button"
						className="allauth-secondary"
						disabled={invitationsLoading || busy}
						onClick={() => void loadInvitations()}
					>
						Refresh
					</button>
				</div>
				<Notice message={invitationsError} error />
				{invitationsLoading ? (
					<Loading />
				) : invitations.filter((invitation) => invitation.status === "pending")
						.length ? (
					<ul className="allauth-list">
						{invitations
							.filter((invitation) => invitation.status === "pending")
							.map((invitation) => (
								<li key={invitation.id}>
									<div>
										<strong>{invitation.organizationName}</strong>
										<p className="allauth-muted">
											Invited as {invitation.role}
										</p>
									</div>
									<div className="allauth-row">
										<button
											type="button"
											disabled={busy}
											onClick={() =>
												void run(
													() =>
														client.organization.acceptInvitation({
															invitationId: invitation.id,
														}),
													"Invitation accepted.",
												)
											}
										>
											Accept
										</button>
										<button
											type="button"
											className="allauth-secondary"
											disabled={busy}
											onClick={() =>
												void run(
													() =>
														client.organization.rejectInvitation({
															invitationId: invitation.id,
														}),
													"Invitation declined.",
												)
											}
										>
											Decline
										</button>
									</div>
								</li>
							))}
					</ul>
				) : (
					!invitationsError && (
						<p className="allauth-muted">No pending invitations.</p>
					)
				)}
			</section>
		</div>
	);
}

/** Select or create a project organization and respond to real invitations. */
export function OrganizationSwitcher({
	className = "",
	style,
	hideCreate = false,
	signInUrl,
}: Appearance & { hideCreate?: boolean; signInUrl?: string }) {
	const context = useAllAuth();
	const session = context.client.useSession();
	return (
		<section
			className={`allauth allauth-card ${className}`}
			style={style}
			aria-label="Organizations"
		>
			<div className="allauth-stack">
				<h2>Organizations</h2>
				{session.isPending ? (
					<Loading />
				) : session.error ? (
					<Notice message={authError(session.error)} error />
				) : !session.data ? (
					<p>
						<a href={appPath(signInUrl ?? context.signInUrl)}>Sign in</a> to
						manage your organizations.
					</p>
				) : !context.capabilities ? (
					<ConfigState />
				) : !context.capabilities.organizations ? (
					<p className="allauth-muted">
						Organizations are not enabled for this app.
					</p>
				) : (
					<OrganizationControls
						key={session.data.user.id}
						hideCreate={hideCreate}
					/>
				)}
			</div>
		</section>
	);
}
