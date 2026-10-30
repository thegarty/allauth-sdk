"use client";

import { useEffect, useId, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Building2, Users } from "lucide-react";
import { useAllAuth } from "./react";
import { Dialog } from "./dialog";
import { authError, proxyBasePath } from "./helpers";

type NativeOrganization = { id: string; name: string; slug: string; logo: string | null };
type NativeMember = { id: string; organizationId: string; userId: string; role: string; user: { name: string; email: string } };
type NativeInvitation = { id: string; organizationId: string; email: string; role: string; status: string; expiresAt: string };
type ProfileData = { organization: NativeOrganization; members: NativeMember[]; invitations: NativeInvitation[]; role: string; userId: string };
type Section = "general" | "members";

/** Native organisation settings shared by every app using the AllAuth SDK. */
export type OrganizationProfileProps = {
	organizationId?: string;
	view?: Section;
	embedded?: boolean;
	onUpdated?: () => void | Promise<void>;
	onDeleted?: () => void | Promise<void>;
	onLeft?: () => void | Promise<void>;
	className?: string;
	style?: CSSProperties;
};

const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const roleHas = (role: string, expected: string) => role.split(",").some((entry) => entry.trim() === expected);
const roleLabel = (role: string) => role.split(",").map((entry) => entry.trim().slice(0, 1).toUpperCase() + entry.trim().slice(1)).join(", ");
function imageUrl(value: string | null): string | undefined {
	if (!value) return undefined;
	try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}
function noticeMessage(value: unknown, fallback: string) {
	const result = record(value);
	const error = record(result?.error);
	return typeof result?.message === "string" ? result.message : typeof error?.message === "string" ? error.message : fallback;
}
async function readNative(basePath: string, endpoint: string, query: URLSearchParams, signal: AbortSignal): Promise<unknown> {
	const response = await fetch(`${proxyBasePath(basePath)}/${endpoint}?${query}`, { credentials: "same-origin", cache: "no-store", signal });
	const value: unknown = await response.json();
	if (!response.ok) throw new Error(noticeMessage(value, "Organisation access could not be verified."));
	return value;
}
function organizationData(value: unknown, organizationId: string): NativeOrganization {
	const item = record(value);
	if (!item || item.id !== organizationId || typeof item.name !== "string" || typeof item.slug !== "string") throw new Error("The organisation could not be verified.");
	return { id: organizationId, name: item.name, slug: item.slug, logo: typeof item.logo === "string" ? item.logo : null };
}
function memberData(value: unknown, organizationId: string): NativeMember {
	const item = record(value); const user = record(item?.user);
	if (!item || item.organizationId !== organizationId || typeof item.id !== "string" || typeof item.userId !== "string" || typeof item.role !== "string" || !user || typeof user.name !== "string" || typeof user.email !== "string") throw new Error("The member list could not be verified.");
	return { id: item.id, userId: item.userId, organizationId, role: item.role, user: { name: user.name, email: user.email } };
}
async function allMembers(basePath: string, organizationId: string, signal: AbortSignal): Promise<NativeMember[]> {
	const members: NativeMember[] = [];
	let total = 1;
	while (members.length < total) {
		const value = record(await readNative(basePath, "organization/list-members", new URLSearchParams({ organizationId, limit: "100", offset: String(members.length) }), signal));
		if (!value || !Array.isArray(value.members) || typeof value.total !== "number" || !Number.isSafeInteger(value.total) || value.total < 0) throw new Error("The member list could not be verified.");
		total = value.total;
		const page = value.members.map((member) => memberData(member, organizationId));
		if (!page.length && members.length < total) throw new Error("The complete member list could not be loaded.");
		members.push(...page);
	}
	if (new Set(members.map((member) => member.id)).size !== members.length) throw new Error("The member list changed. Please reload it.");
	return members;
}
function invitationData(value: unknown, organizationId: string): NativeInvitation[] {
	if (!Array.isArray(value)) throw new Error("Pending invitations could not be verified.");
	return value.map((entry) => {
		const item = record(entry);
		if (!item || item.organizationId !== organizationId || typeof item.id !== "string" || typeof item.email !== "string" || typeof item.role !== "string" || typeof item.status !== "string" || typeof item.expiresAt !== "string") throw new Error("Pending invitations could not be verified.");
		return { id: item.id, organizationId, email: item.email, role: item.role, status: item.status, expiresAt: item.expiresAt };
	}).filter((item) => item.status === "pending" && Date.parse(item.expiresAt) > Date.now());
}

/** Show real native organisation details and enforce its current role in every control. */
export function OrganizationProfile({ organizationId, view = "general", embedded = false, onUpdated, onDeleted, onLeft, className = "", style }: OrganizationProfileProps) {
	const { client, basePath, capabilities } = useAllAuth();
	const session = client.useSession();
	const activeId = session.data?.session.activeOrganizationId;
	const selectedId = organizationId ?? activeId ?? undefined;
	const userId = session.data?.user.id;
	const id = useId();
	const [data, setData] = useState<ProfileData | null>(null);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const [version, setVersion] = useState(0);
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [logo, setLogo] = useState("");
	const [email, setEmail] = useState("");
	const [invitationRole, setInvitationRole] = useState<"member" | "admin">("member");
	const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
	const [confirmation, setConfirmation] = useState<"leave" | "delete" | null>(null);
	const [deleteName, setDeleteName] = useState("");
	const [removeId, setRemoveId] = useState<string | null>(null);
	const [finished, setFinished] = useState<"left" | "deleted" | null>(null);
	const model = data && data.organization.id === selectedId && data.userId === userId ? data : null;
	useEffect(() => {
		setConfirmation(null); setDeleteName(""); setRemoveId(null); setRoleDrafts({}); setFinished(null); setMessage("");
	}, [selectedId, userId]);
	useEffect(() => {
		if (!selectedId || !userId || capabilities?.organizations === false) { setLoading(false); setData(null); return; }
		const controller = new AbortController(); setLoading(true); setError(""); setData(null);
		void (async () => {
			try {
				const query = new URLSearchParams({ organizationId: selectedId });
				const [organization, roleValue, members] = await Promise.all([
					readNative(basePath, "organization/get-full-organization", query, controller.signal),
					readNative(basePath, "organization/get-active-member-role", query, controller.signal),
					allMembers(basePath, selectedId, controller.signal),
				]);
				const role = record(roleValue)?.role;
				if (typeof role !== "string" || !role || !members.some((member) => member.userId === userId)) throw new Error("Your organisation membership could not be verified.");
				const invitations = roleHas(role, "owner") || roleHas(role, "admin")
					? invitationData(await readNative(basePath, "organization/list-invitations", query, controller.signal), selectedId) : [];
				if (controller.signal.aborted) return;
				const result = { organization: organizationData(organization, selectedId), role, members, invitations, userId };
				setData(result); setName(result.organization.name); setSlug(result.organization.slug); setLogo(result.organization.logo ?? ""); setRoleDrafts({});
			} catch (cause) { if (!controller.signal.aborted) setError(authError(cause)); }
			finally { if (!controller.signal.aborted) setLoading(false); }
		})();
		return () => controller.abort();
	}, [basePath, selectedId, userId, capabilities?.organizations, version]);

	const owner = !!model && roleHas(model.role, "owner");
	const manage = owner || !!model && roleHas(model.role, "admin");
	const owners = model?.members.filter((member) => roleHas(member.role, "owner")).length ?? 0;
	const lastOwner = owner && owners <= 1;
	async function run(action: () => Promise<{ error: unknown }>, success: string, after?: () => void | Promise<void>, reload = true) {
		if (!model || busy) return;
		setBusy(true); setError(""); setMessage("");
		let confirmed = false;
		try { const result = await action(); if (result.error) throw result.error; confirmed = true; setMessage(success); await after?.(); if (reload) { await onUpdated?.(); setVersion((value) => value + 1); } }
		catch (cause) { setError(confirmed ? `The organisation change completed, but the app could not refresh. ${authError(cause)}` : authError(cause)); }
		finally { setBusy(false); }
	}
	function update(event: FormEvent) {
		event.preventDefault(); if (!model || !manage) return;
		if (!name.trim() || !slug.trim()) { setError("Enter an organisation name and slug."); return; }
		if (logo.trim() && !imageUrl(logo.trim())) { setError("Use a public HTTPS logo URL."); return; }
		void run(() => client.organization.update({ organizationId: model.organization.id, data: { name: name.trim(), slug: slug.trim(), logo: logo.trim() || null } }), "Organisation profile updated.");
	}
	function invite(event: FormEvent) {
		event.preventDefault(); if (!model || !manage) return;
		void run(() => client.organization.inviteMember({ organizationId: model.organization.id, email: email.trim(), role: invitationRole }), "Invitation sent.", () => setEmail(""));
	}
	const wrapper = `allauth allauth-organization-profile ${embedded ? "allauth-profile-embedded" : "allauth-card"} ${className}`;
	if (session.isPending) return <section className={wrapper} style={style}><p role="status">Loading account…</p></section>;
	if (!session.data) return <section className={wrapper} style={style}><p>Sign in to manage your organisation.</p></section>;
	if (capabilities?.organizations === false) return <section className={wrapper} style={style}><p>Organisations are not enabled for this app.</p></section>;
	if (finished) return <section className={wrapper} style={style}>{error && <p className="allauth-notice allauth-error" role="alert">{error}</p>}<p role="status">{finished === "left" ? "You have left the organisation." : "The organisation has been deleted."}</p></section>;
	if (!selectedId) return <section className={wrapper} style={style}><p>Choose an organisation to manage its settings.</p></section>;
	return <section className={wrapper} style={style} aria-label={view === "general" ? "Organisation general settings" : "Organisation members"}>
		{error && <p className="allauth-notice allauth-error" role="alert">{error}</p>}{message && <p className="allauth-notice" role="status">{message}</p>}
		{loading ? <p role="status">Loading organisation…</p> : !model ? <button type="button" className="allauth-secondary" onClick={() => setVersion((value) => value + 1)}>Try again</button> : <>
			<header className="allauth-profile-heading"><div><h2>{view === "general" ? "General" : "Members"}</h2><p className="allauth-muted">{view === "general" ? "Manage your organisation’s profile and membership." : "Manage the people who can access this organisation."}</p></div><span className="allauth-role-badge">{roleLabel(model.role)}</span></header>
			{view === "general" ? <>
				<section className="allauth-profile-section"><div className="allauth-profile-row">{imageUrl(model.organization.logo) ? <img className="allauth-organization-logo" src={imageUrl(model.organization.logo)} alt={`${model.organization.name} logo`} referrerPolicy="no-referrer"/> : <span className="allauth-organization-avatar" aria-hidden="true">{model.organization.name.slice(0, 1).toUpperCase()}</span>}<div><h3>{model.organization.name}</h3><p className="allauth-muted">{model.organization.slug}</p></div></div>
					{manage ? <form className="allauth-stack" aria-label="Organisation profile" onSubmit={update}>
						<label className="allauth-field" htmlFor={`${id}-name`}>Organisation name<input id={`${id}-name`} value={name} required maxLength={200} disabled={busy} onChange={(event) => setName(event.target.value)}/></label>
						<label className="allauth-field" htmlFor={`${id}-slug`}>Organisation slug<input id={`${id}-slug`} value={slug} required maxLength={200} disabled={busy} onChange={(event) => setSlug(event.target.value)}/></label>
						<label className="allauth-field" htmlFor={`${id}-logo`}>Logo URL <span className="allauth-muted">(optional)</span><input id={`${id}-logo`} type="url" value={logo} maxLength={2048} placeholder="https://example.com/logo.png" disabled={busy} onChange={(event) => setLogo(event.target.value)}/></label>
						<button type="submit" disabled={busy}>{busy ? "Saving…" : "Save organisation"}</button>
					</form> : <p className="allauth-muted">An owner or admin can update this organisation’s profile.</p>}
				</section>
				<section className="allauth-profile-section allauth-danger-zone"><h3>Leave organisation</h3><p>You will lose access to this organisation. You will need an invitation to join again.</p>
					{lastOwner && <p className="allauth-muted" id={`${id}-last-owner`}>You are the last owner. Make another member an owner before leaving.</p>}
					{confirmation === "leave" ? <div className="allauth-confirm" role="group" aria-label="Confirm leaving organisation"><p>Leave {model.organization.name}?</p><div className="allauth-row"><button type="button" disabled={busy || lastOwner} onClick={() => void run(() => client.organization.leave({ organizationId: model.organization.id }), "", async () => { setFinished("left"); await onLeft?.(); }, false)}>Confirm leave</button><button type="button" className="allauth-secondary" disabled={busy} onClick={() => setConfirmation(null)}>Cancel</button></div></div>
						: <button type="button" className="allauth-secondary" disabled={busy || lastOwner} aria-describedby={lastOwner ? `${id}-last-owner` : undefined} onClick={() => { setConfirmation("leave"); setError(""); }}>Leave organisation</button>}
				</section>
				{owner && <section className="allauth-profile-section allauth-danger-zone"><h3>Delete organisation</h3><p>Permanently delete the organisation and remove team access. Connected applications may retain records according to their own policies.</p>
					{confirmation === "delete" ? <div className="allauth-confirm" role="group" aria-label="Confirm deleting organisation"><label className="allauth-field" htmlFor={`${id}-delete`}>Type “{model.organization.name}” to confirm<input id={`${id}-delete`} value={deleteName} autoComplete="off" disabled={busy} onChange={(event) => setDeleteName(event.target.value)}/></label><div className="allauth-row"><button type="button" className="allauth-danger" disabled={busy || deleteName !== model.organization.name} onClick={() => void run(() => client.organization.delete({ organizationId: model.organization.id }), "", async () => { setFinished("deleted"); await onDeleted?.(); }, false)}>Permanently delete organisation</button><button type="button" className="allauth-secondary" disabled={busy} onClick={() => { setConfirmation(null); setDeleteName(""); }}>Cancel</button></div></div>
						: <button type="button" className="allauth-secondary allauth-danger" disabled={busy} onClick={() => { setConfirmation("delete"); setDeleteName(""); setError(""); }}>Delete organisation</button>}
				</section>}
			</> : <>
				<section className="allauth-profile-section"><h3>Members <span className="allauth-muted">({model.members.length})</span></h3><div className="allauth-members-table allauth-members-scroll"><table><thead><tr><th>Member</th><th>Role</th>{manage && <th>Actions</th>}</tr></thead><tbody>{model.members.map((member) => {
					const memberOwner = roleHas(member.role, "owner");
					const lastMemberOwner = memberOwner && owners <= 1;
					const canChange = manage && (!memberOwner || owner) && !lastMemberOwner;
					const canRemove = manage && member.userId !== model.userId && (!memberOwner || owner) && !lastMemberOwner;
					return <tr key={member.id}><td><strong>{member.user.name}{member.userId === model.userId ? " (you)" : ""}</strong><small className="allauth-muted">{member.user.email}</small></td><td>{manage ? <select aria-label={`Role for ${member.user.email}`} value={roleDrafts[member.id] ?? member.role} disabled={busy || !canChange} onChange={(event) => setRoleDrafts((previous) => ({ ...previous, [member.id]: event.target.value }))}><option value={member.role}>{roleLabel(member.role)}</option>{["member", "admin", ...(owner ? ["owner"] : [])].filter((role) => role !== member.role).map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select> : roleLabel(member.role)}{lastMemberOwner && <small className="allauth-muted">Last owner</small>}</td>{manage && <td><div className="allauth-row"><button type="button" className="allauth-secondary" disabled={busy || !canChange || !roleDrafts[member.id] || roleDrafts[member.id] === member.role} onClick={() => void run(() => client.organization.updateMemberRole({ organizationId: model.organization.id, memberId: member.id, role: roleDrafts[member.id] }), "Member role updated.")}>Save role</button><button type="button" className="allauth-secondary" disabled={busy || !canRemove} aria-label={`Remove ${member.user.email}`} onClick={() => setRemoveId(member.id)}>Remove</button></div></td>}</tr>;
				})}</tbody></table></div>
					{removeId && <div className="allauth-confirm" role="group" aria-label="Confirm removing member"><p>Remove {model.members.find((member) => member.id === removeId)?.user.email} from {model.organization.name}?</p><div className="allauth-row"><button type="button" disabled={busy} onClick={() => { const member = model.members.find((item) => item.id === removeId); if (!member || member.userId === model.userId || roleHas(member.role, "owner") && (!owner || owners <= 1)) return; void run(() => client.organization.removeMember({ organizationId: model.organization.id, memberIdOrEmail: member.id }), "Member removed.", () => setRemoveId(null)); }}>Confirm removal</button><button type="button" className="allauth-secondary" disabled={busy} onClick={() => setRemoveId(null)}>Cancel</button></div></div>}
					{!manage && <p className="allauth-muted">An owner or admin can invite people and manage membership.</p>}
				</section>
				{manage && <><section className="allauth-profile-section"><h3>Invite a member</h3><form className="allauth-stack" aria-label="Invite a member" onSubmit={invite}><label className="allauth-field" htmlFor={`${id}-email`}>Email address<input id={`${id}-email`} type="email" value={email} autoComplete="email" required maxLength={320} disabled={busy} onChange={(event) => setEmail(event.target.value)}/></label><label className="allauth-field" htmlFor={`${id}-invite-role`}>Invitation role<select id={`${id}-invite-role`} value={invitationRole} disabled={busy} onChange={(event) => setInvitationRole(event.target.value as "member" | "admin")}><option value="member">Member</option><option value="admin">Admin</option></select></label><button type="submit" disabled={busy}>{busy ? "Sending…" : "Send invitation"}</button></form></section>
					<section className="allauth-profile-section"><h3>Pending invitations</h3>{model.invitations.length ? <ul className="allauth-invitation-list">{model.invitations.map((invitation) => <li className="allauth-profile-row" key={invitation.id}><div><strong>{invitation.email}</strong><p className="allauth-muted">{roleLabel(invitation.role)} · Pending</p></div><button type="button" className="allauth-secondary" disabled={busy} aria-label={`Cancel invitation for ${invitation.email}`} onClick={() => void run(() => client.organization.cancelInvitation({ invitationId: invitation.id }), "Invitation cancelled.")}>Cancel invitation</button></li>)}</ul> : <p className="allauth-muted">No pending invitations.</p>}</section></>}
			</>}
		</>}
	</section>;
}

/** Open General and Members settings in the native SDK's accessible dialog. */
export function OrganizationProfileModal({ open, onClose, organizationId, initialSection = "general", onUpdated, onDeleted, onLeft }: {
	open: boolean; onClose: () => void; organizationId?: string; initialSection?: Section; onUpdated?: () => void | Promise<void>; onDeleted?: () => void | Promise<void>; onLeft?: () => void | Promise<void>;
}) {
	const [section, setSection] = useState<Section>(initialSection);
	useEffect(() => { if (open) setSection(initialSection); }, [open, initialSection, organizationId]);
	return <Dialog open={open} onClose={onClose} title="Organisation" sidebar={<nav aria-label="Organisation settings"><button type="button" className={section === "general" ? "active" : ""} aria-current={section === "general" ? "page" : undefined} onClick={() => setSection("general")}><Building2 size={17} aria-hidden="true"/>General</button><button type="button" className={section === "members" ? "active" : ""} aria-current={section === "members" ? "page" : undefined} onClick={() => setSection("members")}><Users size={17} aria-hidden="true"/>Members</button></nav>}>
		<OrganizationProfile organizationId={organizationId} view={section} embedded onUpdated={onUpdated} onDeleted={async () => { await onDeleted?.(); onClose(); }} onLeft={async () => { await onLeft?.(); onClose(); }}/>
	</Dialog>;
}
