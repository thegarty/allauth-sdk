"use client";
import {
	AuthProvider as BetterAuthUIProvider,
	type AuthProviderProps,
} from "@better-auth-ui/react";
import { QueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createAllAuthClient, type AllAuthClient } from "./client";
import { appPath, proxyBasePath } from "./helpers";
import { SupportBanner } from "./support-banner";

export type AllAuthUIProviderProps = Omit<
	AuthProviderProps<AllAuthClient>,
	"authClient" | "queryClient" | "navigate"
> & {
	basePath?: string;
	/** An explicit cache identity when the embedding app changes its server-side project configuration. */
	projectKey?: string;
	/** Requires the matching supportAccess option on the server proxy. */
	supportAccess?: boolean;
	twoFactorPath?: string;
	navigate?: AuthProviderProps<AllAuthClient>["navigate"];
};

/** Optional Better Auth UI provider. Registry components remain in the consuming application. */
export function AllAuthUIProvider({
	basePath = "/api/allauth",
	projectKey = "",
	twoFactorPath,
	navigate,
	supportAccess = false,
	children,
	...configuration
}: AllAuthUIProviderProps) {
	const path = proxyBasePath(basePath);
	const challengePath = appPath(
		twoFactorPath || `${configuration.basePaths?.auth ?? "/auth"}/two-factor`,
	);
	const pendingChallenge = useMemo(
		() => ({ current: false }),
		[path, projectKey],
	);
	const redirectTo = appPath(configuration.redirectTo || "/");
	const queryClient = useMemo(
		() =>
			new QueryClient({
				defaultOptions: { queries: { staleTime: 0, retry: false } },
			}),
		[path, projectKey],
	);
	const authClient = useMemo(
		() =>
			createAllAuthClient(path, (methods) => {
				if (typeof window === "undefined") return;
				pendingChallenge.current = true;
				try {
					if (methods)
						sessionStorage.setItem(
							"better-auth-ui.two-factor-methods",
							JSON.stringify(
								methods.filter(
									(method) => method === "totp" || method === "otp",
								),
							),
						);
				} catch {
					/* Method hints never block the native challenge. */
				}
				const destination = new URL(challengePath, window.location.origin);
				destination.searchParams.set("redirectTo", redirectTo);
				window.location.assign(destination.href);
			}),
		[path, projectKey, challengePath, redirectTo, pendingChallenge],
	);
	const safeNavigate: AuthProviderProps<AllAuthClient>["navigate"] = (
		options,
	) => {
		const to = appPath(options.to);
		// Native passkey/autofill success callbacks must not overwrite an MFA navigation.
		if (
			pendingChallenge.current &&
			new URL(to, window.location.origin).pathname !==
				new URL(challengePath, window.location.origin).pathname
		)
			return;
		if (navigate) navigate({ ...options, to });
		else if (options.replace) window.location.replace(to);
		else window.location.assign(to);
	};
	return (
		<BetterAuthUIProvider
			{...configuration}
			key={`${path}:${projectKey}`}
			authClient={authClient}
			queryClient={queryClient}
			navigate={safeNavigate}
			socialSignInMode="redirect"
		>{supportAccess && <SupportBanner basePath={path} />}{children}</BetterAuthUIProvider>
	);
}
