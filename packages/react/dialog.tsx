"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

let locks = 0;
let previousOverflow = "";
const focusable = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Native SDK modal with an isolated portal, keyboard focus containment and focus restoration. */
export function Dialog({ open, onClose, title, children, sidebar, className = "" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; sidebar?: ReactNode; className?: string }) {
	const titleId = useId();
	const panel = useRef<HTMLDivElement>(null);
	const close = useRef(onClose);
	close.current = onClose;
	const [mounted, setMounted] = useState(false);
	useEffect(() => { setMounted(true); }, []);
	useEffect(() => {
		if (!open || !mounted) return;
		const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		if (locks++ === 0) { previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"; }
		const timer = window.setTimeout(() => { (panel.current?.querySelector<HTMLElement>(focusable) ?? panel.current)?.focus(); }, 0);
		const keydown = (event: KeyboardEvent) => {
			if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close.current(); return; }
			if (event.key !== "Tab" || !panel.current) return;
			const elements = [...panel.current.querySelectorAll<HTMLElement>(focusable)].filter(element => !element.closest('[hidden],[aria-hidden="true"]'));
			const first = elements[0]; const last = elements[elements.length - 1];
			if (!first) { event.preventDefault(); panel.current.focus(); return; }
			if (event.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
			else if (!event.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
		};
		const keepFocus = (event: FocusEvent) => { if (panel.current && event.target instanceof Node && !panel.current.contains(event.target)) (panel.current.querySelector<HTMLElement>(focusable) ?? panel.current).focus(); };
		document.addEventListener("keydown", keydown, true); document.addEventListener("focusin", keepFocus);
		return () => { window.clearTimeout(timer); document.removeEventListener("keydown", keydown, true); document.removeEventListener("focusin", keepFocus); if (--locks === 0) document.body.style.overflow = previousOverflow; if (previous?.isConnected) previous.focus(); };
	}, [open, mounted]);
	if (!open || !mounted) return null;
	return createPortal(<div className={`allauth allauth-modal-backdrop ${className}`} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
		<div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`allauth-modal${sidebar ? " allauth-modal-with-nav" : ""}`} tabIndex={-1}>
			<header className="allauth-modal-header"><h2 id={titleId}>{title}</h2><button type="button" className="allauth-close" aria-label="Close dialog" onClick={onClose}>×</button></header>
			<div className={`allauth-modal-layout${sidebar ? " allauth-modal-has-sidebar" : ""}`}>{sidebar && <aside className="allauth-modal-sidebar">{sidebar}</aside>}<div className="allauth-modal-main">{children}</div></div>
		</div>
	</div>, document.body);
}
