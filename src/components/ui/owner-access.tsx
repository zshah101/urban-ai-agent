"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

export function OwnerAccess() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const abort = new AbortController();
    void fetch("/api/owner-session", { cache: "no-store", signal: abort.signal }).then(response => response.json()).then(body => setUnlocked(body.authenticated === true)).catch(() => undefined);
    return () => abort.abort();
  }, []);

  useEffect(() => {
    if (open) { dialog.current?.showModal(); input.current?.focus(); }
    else { dialog.current?.close(); }
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const entered = code;
    setCode("");
    try {
      const response = await fetch("/api/owner-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: entered }) });
      if (!response.ok) { setMessage(response.status === 503 ? "Owner access is not configured yet." : "Could not unlock owner access. Check the code and try again."); return; }
      setUnlocked(true);
      setOpen(false);
    } catch { setMessage("Could not unlock owner access. Try again."); }
    finally { setBusy(false); }
  }

  async function lock() {
    setBusy(true);
    try {
      const response = await fetch("/api/owner-session", { method: "DELETE" });
      if (response.ok || response.status === 401) setUnlocked(false);
    } catch { setMessage("Could not lock owner access. Try again."); setOpen(true); }
    finally { setBusy(false); }
  }

  return <div className="mb-7 flex justify-center">
    <button type="button" disabled={busy} onClick={() => { if (unlocked) void lock(); else { setMessage(""); setOpen(true); } }} className="rounded-xl border border-amber-500/30 px-4 py-2 text-sm text-amber-300 focus-visible:outline-2 focus-visible:outline-amber-400 disabled:opacity-50">
      {unlocked ? "Lock owner access" : "Owner access"}
    </button>
    <dialog ref={dialog} onCancel={() => setOpen(false)} onClose={() => { setOpen(false); setCode(""); }} aria-labelledby="owner-access-title" className="w-[min(90vw,400px)] rounded-2xl border border-amber-500/30 bg-[#070d08] p-6 text-white backdrop:bg-black/70">
      <form onSubmit={submit}>
        <h2 id="owner-access-title" className="mb-2 text-xl font-semibold">Owner access</h2>
        <p className="mb-5 text-sm text-white/60">AI queries are private. Enter your access code to unlock them for one hour.</p>
        <label htmlFor="owner-access-code" className="mb-2 block text-sm">Access code</label>
        <input ref={input} id="owner-access-code" type="password" autoComplete="off" required maxLength={512} value={code} onChange={event => setCode(event.target.value)} className="mb-3 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 focus:outline-2 focus:outline-amber-400" />
        <p role="status" className="mb-3 min-h-5 text-sm text-amber-300">{message}</p>
        <div className="flex justify-end gap-3">
          <button type="button" disabled={busy} onClick={() => { setCode(""); setOpen(false); }} className="rounded-lg px-3 py-2 text-white/70">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-amber-400 px-4 py-2 font-medium text-black disabled:opacity-50">{busy ? "Unlocking…" : "Unlock"}</button>
        </div>
      </form>
    </dialog>
  </div>;
}
