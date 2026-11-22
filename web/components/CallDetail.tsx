"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AmplifiedPlayer from "@/components/AmplifiedPlayer";
import { useAutoDismiss } from "@/hooks/useAutoDismiss";
import { friendlyUserError, userMsg } from "@/lib/callErrors";
import {
  formatDuration,
  getCallLabel,
  getCallTypeLabel,
  getDurationSeconds,
  getOutcome,
  getRecordingSource,
  getTranscript,
  isDemoCall,
  recordingSourceLabel,
  type VapiCall,
} from "@/lib/vapi";

export default function CallDetail({ id }: { id: string }) {
  const router = useRouter();
  const [call, setCall] = useState<VapiCall | null>(null);
  /** Full history — needed so "Call Agent 4" matches the list, not fake "1" */
  const [siblings, setSiblings] = useState<VapiCall[]>([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  useAutoDismiss(info, () => setInfo(""));
  useAutoDismiss(error, () => setError(""));
  useEffect(() => {
    async function load() {
      try {
        const [oneRes, listRes] = await Promise.all([
          fetch(`/api/calls/${id}`, { credentials: "same-origin" }),
          fetch("/api/calls", { credentials: "same-origin" }),
        ]);
        const data = await oneRes.json().catch(() => ({}));
        if (!oneRes.ok) {
          setError(friendlyUserError(data.error || userMsg("callNotFound"), "history"));
          return;
        }
        setCall(data);
        setNameDraft(
          String(data.displayName || data.customer?.name || "").trim()
        );

        const list = await listRes.json().catch(() => []);
        if (listRes.ok && Array.isArray(list)) {
          // Ensure current call is in the set even if filters differ slightly
          const byId = new Map<string, VapiCall>(list.map((c: VapiCall) => [c.id, c]));
          byId.set(data.id, data);
          setSiblings([...byId.values()]);
        } else {
          // Don't fake "Call Agent 1" — label falls back to short id
          setSiblings([]);
        }
      } catch (err) {
        setError(friendlyUserError(err, "history"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const next = nameDraft.trim();
    if (!next) {
      setError("Enter a name for this recording.");
      return;
    }
    setRenaming(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch(`/api/calls/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(friendlyUserError(data.error || "Could not rename recording."));
        return;
      }
      if (data.call) {
        setCall(data.call);
        setNameDraft(
          String(data.call.displayName || data.call.customer?.name || next).trim()
        );
      } else {
        setCall((prev) =>
          prev
            ? {
                ...prev,
                displayName: next,
                customer: { ...(prev.customer || {}), name: next },
              }
            : prev
        );
      }
      setInfo("Recording renamed. It will show with this name in Call History.");
    } catch (err) {
      setError(friendlyUserError(err));
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this call, transcript, and recording permanently?")) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/calls/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(friendlyUserError(data.error || userMsg("deleteFail")));
        setDeleting(false);
        return;
      }
      if (data.ok === false) {
        setError(friendlyUserError(data.error || userMsg("deleteFail")));
        setDeleting(false);
        return;
      }
      router.push("/calls");
      router.refresh();
    } catch (err) {
      setError(friendlyUserError(err));
      setDeleting(false);
    }
  }

  if (loading) return <p className="muted">Loading call…</p>;
  if (error && !call) return <p className="error-box">{error}</p>;
  if (!call) return <p className="muted">Call not found.</p>;

  const transcript = getTranscript(call);
  const who = getCallLabel(call, siblings);

  return (
    <article className="panel detail-panel">
      <div className="detail-top">
        <Link href="/calls" className="back-link">
          <span className="back-arrow" aria-hidden="true">
            ←
          </span>
          All calls
        </Link>
        <button
          type="button"
          className="danger-btn"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Deleting…" : "Delete call"}
        </button>
      </div>

      {error && <p className="error-box">{error}</p>}

      <div className="panel-head">
        <p className="eyebrow">
          {isDemoCall(call) ? "Sample recording · zero credits" : "Call record"}
        </p>
        <h1>{who}</h1>
        <p className="lede">
          {call.startedAt ? new Date(call.startedAt).toLocaleString() : "—"} ·{" "}
          {formatDuration(getDurationSeconds(call))} · {getOutcome(call)}
          {isDemoCall(call) ? " · Sample" : ""} · ({getRecordingSource(call)})
        </p>
      </div>

      <form className="rename-form" onSubmit={(e) => void handleRename(e)}>
        <label htmlFor="recording-name">Rename recording</label>
        <div className="rename-row">
          <input
            id="recording-name"
            type="text"
            maxLength={80}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Acme callback — Thu"
            disabled={renaming}
          />
          <button type="submit" className="ghost-btn" disabled={renaming || !nameDraft.trim()}>
            {renaming ? "Saving…" : "Save name"}
          </button>
        </div>
        <p className="hint">This changes the label in Call History. Audio file id stays the same.</p>
      </form>

      {info && <p className="ok-box">{info}</p>}

      <div className="detail-grid">
        <div>
          <h3>Recording</h3>
          <AmplifiedPlayer
            src={`/api/calls/${id}/recording`}
            boost={5}
            downloadName={`vantora-call-${id.slice(0, 8)}`}
          />
          <p className="hint">
            ({getRecordingSource(call)}) = {recordingSourceLabel(getRecordingSource(call))}.{" "}
            <strong>A</strong> = permanent Archive file; <strong>V</strong> = live VAPI (Pull +
            deploy to archive). After a live call, wait briefly then refresh if audio is not ready.
          </p>
        </div>

        <div>
          <h3>Details</h3>
          <dl className="meta-list">
            <div>
              <dt>Call ID</dt>
              <dd>{call.id}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{getCallTypeLabel(call)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{call.status || "—"}</dd>
            </div>
            <div>
              <dt>Ended reason</dt>
              <dd>{call.endedReason || "—"}</dd>
            </div>
            <div className="meta-inline">
              <dt>Storage</dt>
              <dd>
                ({getRecordingSource(call)})
                {isDemoCall(call) ? " · demo sample" : ""}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {call.summary && (
        <div className="summary-card">
          <h3>Summary</h3>
          <p>{call.summary}</p>
        </div>
      )}

      <div className="transcript-block">
        <div className="row between">
          <h3>Transcript</h3>
          {transcript && (
            <div className="row">
              <button
                type="button"
                className="ghost-btn sm"
                onClick={() => {
                  void navigator.clipboard.writeText(transcript).then(
                    () => setInfo("Transcript copied."),
                    () => setError("Could not copy transcript.")
                  );
                }}
              >
                Copy
              </button>
              <button
                type="button"
                className="ghost-btn sm"
                onClick={() => {
                  const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `vantora-transcript-${id.slice(0, 8)}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                  setInfo("Transcript downloaded.");
                }}
              >
                Download .txt
              </button>
            </div>
          )}
        </div>
        {transcript ? (
          <pre>{transcript}</pre>
        ) : (
          <p className="muted">Transcript not ready yet. Refresh in a minute.</p>
        )}
      </div>
    </article>
  );
}
