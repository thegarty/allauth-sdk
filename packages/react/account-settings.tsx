"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { OrganizationSwitcher, UserProfile, useAllAuth } from "./react";
import type { OrganizationHeaderProps } from "./header";
import { appPath, authError } from "./helpers";

type AccountSection = "profile" | "security" | "organizations";
type UserInvitation = { id: string; organizationName: string; role: string; status: string };

/** Full-page account settings use the same native profile and security panels as account dialogs. */
export type AccountSettingsProps = OrganizationHeaderProps & {
	initialSection?: AccountSection;
	onUpdated?: () => void | Promise<void>;
	signInUrl?: string;
	className?: string;
	style?: CSSProperties;
};

function AccountOrganizations({ hideCreate, onSelect, onCreate, onOrganizationChange }: OrganizationHeaderProps) {
	const { client } = useAllAuth();
	const organizations = client.useListOrganizations();
	const [invitations, setInvitations] = useState<UserInvitation[]>([]);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const load = useCallback(async () => {
		setLoading(true); setError("");
		try {
			const response = await client.organization.listUserInvitations();
			if (response.error) throw response.error;
			setInvitations((response.data ?? []).filter((invitation) => invitation.status === "pending"));
		} catch (cause) { setError(authError(cause)); }
		finally { setLoading(false); }
	}, [client]);
	useEffect(() => { void load(); }, [load]);
	async function respond(invitationId: string, accept: boolean) {
		if (busy) return;
		setBusy(true); setError(""); setMessage("");
		try {
			const result = accept ? await client.organization.acceptInvitation({ invitationId }) : await client.organization.rejectInvitation({ invitationId });
			if (result.error) throw result.error;
			setMessage(accept ? "Invitation accepted." : "Invitation declined.");
			await organizations.refetch();
			await client.getSession({ query: { disableCookieCache: true } });
			await load();
		} catch (cause) { setError(authError(cause)); }
		finally { setBusy(false); }
	}
	return <section className="allauth-account-organizations" aria-label="Your organisations">
		<header className="allauth-profile-heading"><div><h2>Organisations</h2><p className="allauth-muted">Choose an organisation to switch workspace or manage its members and settings.</p></div></header>
		<OrganizationSwitcher variant="compact" managementMode="modal" hideCreate={hideCreate} onSelect={onSelect} onCreate={onCreate} onOrganizationChange={onOrganizationChange}/>
		<section className="allauth-profile-section"><div className="allauth-row"><h3>Your invitations</h3><button type="button" className="allauth-secondary allauth-compact-button" disabled={loading || busy} onClick={() => void load()}>Refresh</button></div>
			{error && <p className="allauth-notice allauth-error" role="alert">{error}</p>}{message && <p className="allauth-notice" role="status">{message}</p>}
			{loading ? <p className="allauth-muted" role="status">Loading invitations…</p> : invitations.length ? <ul className="allauth-invitation-list">{invitations.map((invitation) => <li className="allauth-invitation-item" key={invitation.id}><div className="allauth-invitation-identity"><strong>{invitation.organizationName}</strong><span className="allauth-muted">Invited as {invitation.role}</span></div><div className="allauth-row"><button type="button" className="allauth-compact-button" disabled={busy} aria-label={`Accept invitation to ${invitation.organizationName}`} onClick={() => void respond(invitation.id, true)}>Accept</button><button type="button" className="allauth-secondary allauth-compact-button" disabled={busy} aria-label={`Decline invitation to ${invitation.organizationName}`} onClick={() => void respond(invitation.id, false)}>Decline</button></div></li>)}</ul> : !error && <p className="allauth-muted">No pending invitations.</p>}
		</section>
	</section>;
}

/** Native Profile, Security and Organisations tabs for an application's account page. */
export function AccountSettings({ initialSection = "profile", onUpdated, signInUrl, className = "", style, hideCreate, onSelect, onCreate, onOrganizationChange }: AccountSettingsProps) {
	const context = useAllAuth();
	const session = context.client.useSession();
	const [section, setSection] = useState<AccountSection>(initialSection);
	const id = useId();
	const navigation = useRef<HTMLElement>(null);
	const sections: { id: AccountSection; label: string }[] = [{ id: "profile", label: "Profile" }, { id: "security", label: "Security" }, ...(context.capabilities?.organizations ? [{ id: "organizations" as const, label: "Organisations" }] : [])];
	const selected = sections.some((entry) => entry.id === section) ? section : "profile";
	return <section className={`allauth allauth-account-settings ${className}`} style={style} aria-label="Account settings">
		<nav ref={navigation} className="allauth-account-tabs" role="tablist" aria-label="Account sections" onKeyDown={(event) => {
			if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
			event.preventDefault();
			const index = sections.findIndex((entry) => entry.id === selected);
			const next = event.key === "Home" ? 0 : event.key === "End" ? sections.length - 1 : (index + (event.key === "ArrowLeft" ? -1 : 1) + sections.length) % sections.length;
			setSection(sections[next].id);
			navigation.current?.querySelector<HTMLButtonElement>(`[data-section="${sections[next].id}"]`)?.focus();
		}}>{sections.map((entry) => <button key={entry.id} id={`${id}-${entry.id}-tab`} type="button" role="tab" data-section={entry.id} aria-selected={selected === entry.id} aria-controls={`${id}-panel`} tabIndex={selected === entry.id ? 0 : -1} onClick={() => setSection(entry.id)}>{entry.label}</button>)}</nav>
		<div className="allauth-account-panel" id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${selected}-tab`} tabIndex={0}>
			{session.isPending ? <p role="status">Loading account…</p> : session.error ? <p className="allauth-notice allauth-error" role="alert">{authError(session.error)}</p> : !session.data ? <p><a href={appPath(signInUrl ?? context.signInUrl)}>Sign in</a> to manage your account.</p> : selected === "organizations" ? <AccountOrganizations key={session.data.user.id} hideCreate={hideCreate} onSelect={onSelect} onCreate={onCreate} onOrganizationChange={onOrganizationChange}/> : <UserProfile section={selected} embedded signInUrl={signInUrl} onUpdated={onUpdated}/>}
		</div>
	</section>;
}
