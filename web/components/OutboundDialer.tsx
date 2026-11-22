"use client";

import { useState } from "react";
import { useAutoDismiss } from "@/hooks/useAutoDismiss";
import {
  friendlyUserError,
  userMsg,
  validateOutboundPhone,
} from "@/lib/callErrors";

const DIALER_NOTES = [
  {
    title: "When to use",
    body: "Real phone checks — confirm Alex rings a US (+1) mobile or landline end-to-end.",
  },
  {
    title: "Credits & limits",
    body: "Each outbound minute uses VAPI credits. Free lines often cap daily attempts — prefer Call Agent for demos.",
  },
  {
    title: "After the call",
    body: "Recording lands on VAPI first. Use Pull latest recordings so it appears in permanent Call History.",
  },
  {
    title: "Compliance",
    body: "Only dial numbers you are allowed to contact. Respect do-not-call and quiet hours.",
  },
];

export default function OutboundDialer() {
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useAutoDismiss(error, () => setError(""));
  useAutoDismiss(message, () => setMessage(""));

  async function placeCall(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const validated = validateOutboundPhone(number);
    if (!validated.ok) {
      setError(validated.error);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: validated.e164 }),
      });

      let data: { error?: string; id?: string } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setError(friendlyUserError(data.error || userMsg("genericStart"), "start"));
        return;
      }

      setMessage(userMsg("outboundStarted"));
      setNumber("");
    } catch (err) {
      setError(friendlyUserError(err, "start"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel dialer-panel">
      <div className="panel-head">
        <p className="eyebrow">Live telephony</p>
        <h2>Outbound dialer</h2>
        <p className="lede">
          Dial a real US (+1) number through your VAPI phone line. Best for a short live telephony
          check after you have tried Call Agent.
        </p>
      </div>

      <ul className="panel-notes">
        {DIALER_NOTES.map((note) => (
          <li key={note.title}>
            <strong>{note.title}</strong>
            <span>{note.body}</span>
          </li>
        ))}
      </ul>

      <form className="dialer-form" onSubmit={placeCall} noValidate>
        <label htmlFor="phone">Phone number (with country code)</label>
        <div className="dialer-row">
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+14155552671"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            aria-invalid={Boolean(error)}
          />
          <button type="submit" disabled={loading || !number.trim()}>
            {loading ? "Calling…" : "Call now"}
          </button>
        </div>
        <p className="hint">Example: +1 415 555 2671 · E.164 format preferred</p>
      </form>

      {message && <p className="ok-box">{message}</p>}
      {error && <p className="error-box">{error}</p>}
    </section>
  );
}
