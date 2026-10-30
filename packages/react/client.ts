import {
	organizationClient,
	twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";
import { proxyBasePath } from "./helpers";

/** Create a native client that can only send requests through the app's own proxy. */
export function createAllAuthClient(
	basePath: string,
	onTwoFactorRedirect: (methods?: string[]) => void,
) {
	const path = proxyBasePath(basePath);
	const origin =
		typeof window === "undefined" ? "http://localhost" : window.location.origin;
	const organization = organizationClient({ teams: { enabled: true } });
	return createAuthClient({
		baseURL: `${origin}${path}`,
		fetchOptions: {
			credentials: "same-origin",
			cache: "no-store",
			customFetchImpl: async (input, init) => {
				const url = new URL(
					input instanceof Request ? input.url : String(input),
					origin,
				);
				const appOrigin =
					typeof window === "undefined" ? origin : window.location.origin;
				if (
					url.origin !== appOrigin ||
					!(url.pathname === path || url.pathname.startsWith(`${path}/`))
				)
					throw new Error(
						"AllAuth requests must use the app's same-origin proxy.",
					);
				return fetch(input, {
					...init,
					credentials: "same-origin",
					cache: "no-store",
				});
			},
		},
		plugins: [
			passkeyClient(),
			{ ...organization, atomListeners: [...organization.atomListeners, { matcher: (path: string) => path === "/organization/accept-invitation", signal: "$listOrg" }] },
			twoFactorClient({
				onTwoFactorRedirect: ({ twoFactorMethods }) =>
					onTwoFactorRedirect(twoFactorMethods),
			}),
		],
	});
}

export type AllAuthClient = ReturnType<typeof createAllAuthClient>;
