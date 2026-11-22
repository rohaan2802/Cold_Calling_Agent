"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAutoDismiss } from "@/hooks/useAutoDismiss";
import { friendlyUserError, userMsg } from "@/lib/callErrors";
import {
  formatDuration,
  getCallLabel,
  getCallTypeLabel,
  getDurationSeconds,
  getOutcome,
  getRecordingSource,
  isDemoCall,
  type VapiCall,
} from "@/lib/vapi";

const PAGE_SIZE = 10;

type TypeFilter = "all" | "web" | "outbound" | "inbound" | "demo";
type OutcomeFilter = "all" | "Interested" | "Callback" | "Not interested" | "Do not call" | "Other";

function matchesType(call: VapiCall, filter: TypeFilter): boolean {
  if (filter === "all") return true;
  if (filter === "demo") return isDemoCall(call);
  const label = getCallTypeLabel(call).toLowerCase();
  if (filter === "web") return label.includes("call agent") || label.includes("web");
  if (filter === "outbound") return label.includes("outbound");
  if (filter === "inbound") return label.includes("inbound");
  return true;
}

function matchesOutcome(call: VapiCall, filter: OutcomeFilter): boolean {
  if (filter === "all") return true;
  const o = getOutcome(call);
  if (filter === "Other") {
    return !["Interested", "Callback", "Not interested", "Do not call", "Send email"].includes(o);
  }
  if (filter === "Interested") return o === "Interested" || o === "Send email";
  return o === filter;
}

/** Newest call first (live or demo) — startedAt preferred over createdAt */
function sortCalls(calls: VapiCall[]): VapiCall[] {
  return [...calls].sort((a, b) => {
    const ta = new Date(a.startedAt || a.createdAt || 0).getTime();
    const tb = new Date(b.startedAt || b.createdAt || 0).getTime();
    return tb - ta;
  });
}

export default function CallHistory() {
  const [calls, setCalls] = useState<VapiCall[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [archiveUpdatedAt, setArchiveUpdatedAt] = useState<string>("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");

  useAutoDismiss(error, () => setError(""));
  useAutoDismiss(info, () => setInfo(""));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortCalls(calls).filter((c) => {
      if (!matchesType(c, typeFilter)) return false;
      if (!matchesOutcome(c, outcomeFilter)) return false;
      if (!q) return true;
      const hay = [
        c.id,
        c.displayName,
        c.summary,
        c.transcript,
        c.customer?.name,
        c.customer?.number,
        getCallLabel(c, calls),
        getCallTypeLabel(c),
        getOutcome(c),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [calls, query, typeFilter, outcomeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageCalls = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const stats = useMemo(() => {
    const demos = calls.filter(isDemoCall).length;
    const live = calls.length - demos;
    const interested = calls.filter((c) => {
      const o = getOutcome(c);
      return o === "Interested" || o === "Send email";
    }).length;
    const callbacks = calls.filter((c) => getOutcome(c) === "Callback").length;
    return { total: calls.length, demos, live, interested, callbacks };
  }, [calls]);

  async function loadArchiveMeta() {
    try {
      const res = await fetch("/api/archive/sync", { credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.updatedAt) setArchiveUpdatedAt(String(data.updatedAt));
    } catch {
      /* optional */
    }
  }

  async function load(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      // Bust browser/CDN cache — Refresh was returning a stale list
      const res = await fetch(`/api/calls?t=${Date.now()}`, {
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(friendlyUserError(data.error || userMsg("loadCalls")));
        if (!isRefresh) setCalls([]);
        return;
      }
      const next = Array.isArray(data) ? data : [];
      setCalls(next);
      // Always jump to page 1 on refresh so the newest row is visible
      if (isRefresh) setPage(1);
      else {
        setPage((p) => {
          const pages = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
          return Math.min(p, pages);
        });
      }
      void loadArchiveMeta();
    } catch (err) {
      setError(friendlyUserError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load(false);
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const onEnded = () => {
      // VAPI list lags a few seconds — poll so Refresh/auto-refresh catches the new row
      void (async () => {
        for (const wait of [0, 2500, 6000, 12000]) {
          if (wait) await sleep(wait);
          await load(true);
        }
      })();
    };
    window.addEventListener("vantora:call-ended", onEnded);
    return () => window.removeEventListener("vantora:call-ended", onEnded);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, typeFilter, outcomeFilter]);

  async function syncArchive() {
    setSyncing(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/archive/sync", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          friendlyUserError(
            data.error || "Could not pull recordings. Locally try: npm run archive:recordings"
          )
        );
        return;
      }
      if (data.mode === "github-dispatch") {
        setInfo(
          "Pull started on GitHub (~1 min). Waiting for archive so badges flip (V) → (A)…"
        );
        await load(true);
        // Poll every 15s up to ~3 min — GitHub index is enough for (A); no need to wait for Vercel disk
        let flipped = false;
        for (let i = 0; i < 12; i++) {
          await new Promise((r) => setTimeout(r, 15000));
          await load(true);
          // Stop early once no live-only (V) rows remain among non-demos
          // (load refreshes state; check via a fresh fetch)
          try {
            const check = await fetch(`/api/calls?t=${Date.now()}`, {
              cache: "no-store",
              credentials: "same-origin",
            });
            const list = (await check.json().catch(() => [])) as Array<{
              id?: string;
              demo?: boolean;
              source?: string;
              archivedAt?: string;
              recordingUrl?: string;
            }>;
            if (Array.isArray(list)) {
              const pendingV = list.filter((c) => {
                if (!c?.id || String(c.id).startsWith("demo-") || c.demo) return false;
                const url = String(c.recordingUrl || "").toLowerCase();
                const isA =
                  Boolean(c.archivedAt) ||
                  c.source === "vapi-sync" ||
                  c.source === "github-archive" ||
                  c.source === "demo-seed" ||
                  url.includes("/call-archive/");
                return !isA;
              });
              if (pendingV.length === 0) {
                flipped = true;
                break;
              }
            }
          } catch {
            /* keep polling */
          }
        }
        setInfo(
          flipped
            ? "Archive updated — recordings now show (A). Refresh anytime to re-check."
            : "Still waiting on GitHub/Vercel. Press Refresh in a moment — (V) becomes (A) once archive is on main."
        );
      } else {
        setInfo(
          `Pulled latest into archive (${typeof data.total === "number" ? data.total : "ok"} call(s)). Badges should show (A) now.`
        );
        await load(true);
      }
    } catch (err) {
      setError(friendlyUserError(err));
    } finally {
      setSyncing(false);
    }
  }

  function exportCsv() {
    const rows = [
      ["id", "type", "outcome", "when", "duration_sec", "summary", "demo"].join(","),
      ...filtered.map((c) =>
        [
          c.id,
          getCallTypeLabel(c),
          getOutcome(c),
          c.startedAt || c.createdAt || "",
          getDurationSeconds(c) ?? "",
          JSON.stringify(c.summary || ""),
          isDemoCall(c) ? "yes" : "no",
        ].join(",")
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vantora-calls-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setInfo("CSV exported for the current filter.");
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const demo = calls.find((c) => c.id === id);
    const msg = isDemoCall(demo || { id })
      ? "Delete this demo sample permanently from the website? (It will not come back from VAPI.)"
      : "Delete this call and its recording permanently?";
    if (!confirm(msg)) return;

    setCalls((prev) => prev.filter((c) => c.id !== id));
    setDeletingId(id);
    setError("");
    setInfo("");

    try {
      const res = await fetch(`/api/calls/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(friendlyUserError(data.error || userMsg("deleteFail")));
        await load(true);
        return;
      }
      if (data.ok === false) {
        setError(friendlyUserError(data.error || userMsg("deleteFail")));
        return;
      }
      setInfo(
        data.deletedOnGitHub
          ? "Removed permanently from archive + GitHub."
          : "Removed from this website. Sync GitHub token if you need Vercel to match."
      );
    } catch (err) {
      setError(friendlyUserError(err));
      await load(true);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="panel history-panel" id="history">
      <div className="panel-head row">
        <div>
          <p className="eyebrow">Permanent recording archive</p>
          <h2>Call history</h2>
          <p className="lede">
            Newest first. After Pull (~1 min) press Refresh — badges flip <strong>(V)</strong> →{" "}
            <strong>(A)</strong> as soon as GitHub archive updates (no need to wait for full redeploy).
          </p>
          {archiveUpdatedAt && (
            <p className="hint">
              Archive last updated {new Date(archiveUpdatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="row">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => void syncArchive()}
            disabled={loading || syncing}
            title="Local: download new VAPI recordings into archive now. Live site: triggers GitHub Action when tokens are set. Demos are never overwritten."
          >
            {syncing ? "Pulling…" : "Pull latest recordings"}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={exportCsv}
            disabled={loading || filtered.length === 0}
          >
            Export CSV
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => void load(true)}
            disabled={loading || refreshing || syncing}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="history-stats" aria-label="Call stats">
        <div>
          <strong>{stats.total}</strong>
          <span>Total</span>
        </div>
        <div>
          <strong>{stats.demos}</strong>
          <span>Demos</span>
        </div>
        <div>
          <strong>{stats.live}</strong>
          <span>Live archived</span>
        </div>
        <div>
          <strong>{stats.interested}</strong>
          <span>Interested</span>
        </div>
        <div>
          <strong>{stats.callbacks}</strong>
          <span>Callbacks</span>
        </div>
      </div>

      <div className="history-filters">
        <label className="filter-field">
          <span>Search</span>
          <input
            type="search"
            placeholder="Name, number, outcome, transcript…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="filter-field">
          <span>Type</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          >
            <option value="all">All types</option>
            <option value="demo">Demos only</option>
            <option value="web">Call Agent / web</option>
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Outcome</span>
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value as OutcomeFilter)}
          >
            <option value="all">All outcomes</option>
            <option value="Interested">Interested</option>
            <option value="Callback">Callback</option>
            <option value="Not interested">Not interested</option>
            <option value="Do not call">Do not call</option>
            <option value="Other">Other</option>
          </select>
        </label>
      </div>

      {loading && calls.length === 0 && <p className="muted">Loading calls…</p>}
      {error && <p className="error-box">{error}</p>}
      {info && !error && <p className="ok-box">{info}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="muted">
          No calls match these filters. Clear search or pull latest recordings after a live call.
        </p>
      )}

      <ul className="call-list">
        {pageCalls.map((call) => {
          const duration = formatDuration(getDurationSeconds(call));
          const who = getCallLabel(call, calls);
          const when = call.startedAt || call.createdAt;
          return (
            <li key={call.id}>
              <div className="call-row">
                <Link href={`/calls/${call.id}`} className="call-main">
                  <strong className="call-title">
                    {who}
                    <span
                      className={`badge source-badge source-${getRecordingSource(call).toLowerCase()}`}
                      title={
                        getRecordingSource(call) === "A"
                          ? "Playing from permanent Archive"
                          : "Playing from live VAPI (archive after Pull + deploy)"
                      }
                    >
                      ({getRecordingSource(call)})
                    </span>
                  </strong>
                  <span className="meta">
                    {when ? new Date(when).toLocaleString() : "—"} · {duration} ·{" "}
                    {getCallTypeLabel(call)}
                    {call.summary ? ` · ${call.summary}` : ""}
                  </span>
                </Link>
                <div className="call-actions">
                  <span
                    className={`badge sample${isDemoCall(call) ? "" : " badge-slot"}`}
                    aria-hidden={!isDemoCall(call)}
                  >
                    Demo
                  </span>
                  <span className="badge badge-outcome">{getOutcome(call)}</span>
                  <button
                    type="button"
                    className="danger-btn sm"
                    onClick={(e) => handleDelete(call.id, e)}
                    disabled={deletingId === call.id}
                  >
                    {deletingId === call.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {filtered.length > PAGE_SIZE && (
        <div className="pager" role="navigation" aria-label="Call pages">
          <button
            type="button"
            className="ghost-btn"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <p className="pager-meta">
            Page {page} of {totalPages}
            <span className="muted">
              {" "}
              · {filtered.length} shown / {calls.length} total
            </span>
          </p>
          <button
            type="button"
            className="ghost-btn"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
