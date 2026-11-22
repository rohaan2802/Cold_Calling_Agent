"use client";

import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { useAutoClearWhen, useAutoDismiss } from "@/hooks/useAutoDismiss";
import { extractRawError, friendlyUserError, userMsg } from "@/lib/callErrors";
import {
  ENGLISH_END_MESSAGE,
  ENGLISH_FIRST_MESSAGE,
  ENGLISH_SYSTEM_PROMPT,
} from "@/lib/englishSystemPrompt";
import {
  ENGLISH_LOCK,
  URDU_LOCK_REINFORCE,
  URDU_SYSTEM_PROMPT,
} from "@/lib/urduSystemPrompt";
import {
  VOICE_SPEED,
  endCallPhrasesFor,
  isAssistantGoodbye,
  isUserHangupRequest,
  speechCaptureOverrides,
} from "@/lib/speechConfig";

type TranscriptLine = { role: string; text: string };
type Lang = "english" | "urdu";


const CALL_AGENT_NOTES = [
  {
    title: "Best for demos",
    body: "Talk in the browser with your mic — no phone number needed. Uses far fewer credits than outbound.",
  },
  {
    title: "Language lock",
    body: "Pick English or Urdu before you start. That language stays locked for the whole call.",
  },
  {
    title: "Hangup",
    body: "Say goodbye / bye bye / call cut to end cleanly. Short pauses are fine — Alex keeps listening.",
  },
  {
    title: "After the call",
    body: "Recording saves to VAPI first. Pull latest recordings to keep it in permanent Call History.",
  },
];

const OPENINGS: Record<Lang, string> = {
  english: ENGLISH_FIRST_MESSAGE,
  urdu: "Assalam o alaikum — Alex Vantora se. Follow-ups asaan banate hain. Tees seconds mil sakte hain?",
};

const END_MSG: Record<Lang, string> = {
  english: ENGLISH_END_MESSAGE,
  urdu: "Aapke time ka shukriya — Allah hafiz!",
};

const UI = {
  english: {
    eyebrow: "Browser voice · no phone needed",
    title: "Call Agent",
    lede: "Choose English or Urdu, then start. Language stays locked for the whole call.",
    langLabel: "Language",
    lockedLive: "Locked for this call",
    start: "Call Agent (English)",
    end: "End call",
    loading: "Loading…",
    ready: "Ready · English selected",
    connecting: "Connecting… Alex will speak in a moment",
    endedStatus: "Call ended — recording will land in Call History after archive",
    speaking: "Alex is speaking…",
    listening: "Listening…",
    selectInfo: "English selected — the call will start in English.",
    endedOk: "Call finished. Open Call History (or Sync archive) to play the recording.",
  },
  urdu: {
    eyebrow: "Browser voice · phone ki zaroorat nahi",
    title: "Call Agent",
    lede: "Pehle English ya Urdu choose karein, phir call start karein. Language poori call ke liye lock rehti hai.",
    langLabel: "Language",
    lockedLive: "Is call ke liye lock",
    start: "Call Agent (Urdu)",
    end: "End call",
    loading: "Loading…",
    ready: "Ready · Urdu selected",
    connecting: "Connect ho raha hai… Alex abhi bolega",
    endedStatus: "Call khatam — recording archive ke baad History mein aati hai",
    speaking: "Alex bol raha hai…",
    listening: "Sun raha hai… boliye",
    selectInfo: "Urdu selected — call Urdu mein start hogi.",
    endedOk: "Call theek se khatam hui. History kholo ya Sync archive dabao recording ke liye.",
  },
} as const;

function isBenignHangupError(message: string): boolean {
  return /meeting has ended|meeting ended in error|meeting ended|exiting meeting|room was deleted|room deleted|ejected|ejection|left the call|call ended|connection.*closed|websocket.*close|daily\.co|hangup|ended reason|bye/i.test(
    message
  );
}

function errorText(e: unknown): string {
  return extractRawError(e);
}

type ConvMsg = { role?: string; message?: string; content?: string };

function linesFromConversation(messages: ConvMsg[]): TranscriptLine[] {
  return messages
    .map((m) => {
      const text = (m.message || m.content || "").trim();
      if (!text) return null;
      if (m.role === "system" || m.role === "tool" || m.role === "function") return null;
      const role = m.role === "bot" || m.role === "assistant" ? "Alex" : "You";
      return { role, text };
    })
    .filter((x): x is TranscriptLine => Boolean(x));
}

function mergeTranscript(
  fromConversation: TranscriptLine[],
  prev: TranscriptLine[]
): TranscriptLine[] {
  if (!fromConversation.length) return prev;
  const key = (l: TranscriptLine) => `${l.role}|${l.text.toLowerCase()}`;
  const seen = new Set(fromConversation.map(key));
  const extras = prev.filter((l) => l.role === "You" && !seen.has(key(l)));
  return [...fromConversation, ...extras].slice(-60);
}

export default function TalkToAgent() {
  const vapiRef = useRef<Vapi | null>(null);
  const endingRef = useRef(false);
  const startedRef = useRef(false);
  const langRef = useRef<Lang>("english");
  /** 0 = first check, 1 = second check, 2 = polite end */
  const idleStepRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hangupDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Wait until Alex finishes speaking, then start the 2s hangup delay */
  const pendingEndAfterSpeechRef = useRef(false);
  const speakingRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [active, setActive] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [language, setLanguage] = useState<Lang>("english");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const callStartedAtRef = useRef<number | null>(null);
  const lockSentRef = useRef(false);
  const firstSpeechDoneRef = useRef(false);

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "";
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || "";
  const copy = UI[language];

  function notifyHistoryRefresh() {
    try {
      window.dispatchEvent(new CustomEvent("vantora:call-ended"));
    } catch {
      /* ignore */
    }
  }

  function formatElapsed(total: number): string {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem("vantora_call_lang");
      if (saved === "english" || saved === "urdu") {
        setLanguage(saved);
        langRef.current = saved;
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!active) {
      callStartedAtRef.current = null;
      return;
    }
    callStartedAtRef.current = Date.now();
    setElapsedSec(0);
    const t = setInterval(() => {
      const start = callStartedAtRef.current;
      if (!start) return;
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [active]);

  function maxVapiVolume(vapi: Vapi) {
    try {
      vapi.setVolume(1);
    } catch {
      /* ignore */
    }
  }

  function tearDownVoiceBoost() {
    /* Web Audio boost removed — it froze mid-call voice */
  }

  function amplifyAssistantAudio(player: HTMLAudioElement) {
    // Native volume only — never Web Audio MediaElementSource (breaks mid-call voice).
    try {
      player.muted = false;
      player.volume = 1;
      void player.play?.();
    } catch {
      /* ignore */
    }
  }

  function clearIdleTimer() {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }

  function clearHangupDelay() {
    if (hangupDelayRef.current) {
      clearTimeout(hangupDelayRef.current);
      hangupDelayRef.current = null;
    }
  }

  function resetIdleSteps() {
    idleStepRef.current = 0;
    clearIdleTimer();
  }

  /** Hard stop the Daily/VAPI call */
  function hardStopCall() {
    const vapi = vapiRef.current;
    if (!vapi) return;
    try {
      vapi.send({ type: "end-call" });
    } catch {
      /* ignore */
    }
    try {
      void vapi.stop();
    } catch {
      /* ignore */
    }
  }

  /** Start / restart the exact 2s hangup timer */
  function armHangupDelay(ms = 2000) {
    clearHangupDelay();
    hangupDelayRef.current = setTimeout(() => {
      hangupDelayRef.current = null;
      pendingEndAfterSpeechRef.current = false;
      hardStopCall();
    }, ms);
  }

  /**
   * After goodbye finishes: wait 2s then MUST hang up.
   * Also keeps a safety timer if speech-end never fires.
   */
  function scheduleCallEndAfterSpeech(ms = 2000) {
    endingRef.current = true;
    resetIdleSteps();
    pendingEndAfterSpeechRef.current = true;
    // If already not speaking (line already done), cut in ms
    if (!speakingRef.current) {
      armHangupDelay(ms);
      return;
    }
    // While speaking: speech-end will arm 2s; safety net if speech-end missed
    clearHangupDelay();
    hangupDelayRef.current = setTimeout(() => {
      hangupDelayRef.current = null;
      pendingEndAfterSpeechRef.current = false;
      hardStopCall();
    }, 8000);
  }

  function forceHangupFromUser() {
    const vapi = vapiRef.current;
    if (!vapi) return;
    if (endingRef.current && hangupDelayRef.current) return;

    endingRef.current = true;
    resetIdleSteps();
    const bye =
      langRef.current === "urdu"
        ? "Theek hai. Aapke time ka shukriya. Allah hafiz!"
        : "Got it — thanks for your time. Goodbye!";
    try {
      // endCallAfterSpoken=true so VAPI also ends after the line
      vapi.say(bye, true, true, true);
    } catch {
      /* ignore */
    }
    speakingRef.current = true;
    pendingEndAfterSpeechRef.current = true;
    // Absolute: hang up 2s after we expect the short bye to finish (~1.5s + 2s)
    clearHangupDelay();
    hangupDelayRef.current = setTimeout(() => {
      hangupDelayRef.current = null;
      pendingEndAfterSpeechRef.current = false;
      hardStopCall();
    }, 3500);
  }

  /**
   * Production: do NOT inject idle system nudges or vapi.say("Are you there?").
   * Those froze Alex mid-call. Silence is handled by silenceTimeoutSeconds + prompt.
   */
  function armIdleTimer() {
    clearIdleTimer();
  }

  function buildOverrides(lang: Lang) {
    const code = lang === "urdu" ? "ur" : "en";
    const speech = speechCaptureOverrides(code, {
      clientManagedIdle: true,
      endOnSilence: false,
    });

    if (lang === "urdu") {
      return {
        firstMessage: OPENINGS.urdu,
        endCallMessage: END_MSG.urdu,
        endCallPhrases: endCallPhrasesFor("ur"),
        variableValues: { preferredLanguage: "Urdu" },
        model: {
          provider: "groq",
          model: "llama-3.3-70b-versatile",
          temperature: 0.55,
          maxTokens: 140,
          messages: [{ role: "system", content: URDU_SYSTEM_PROMPT }],
        },
        voice: {
          provider: "vapi",
          voiceId: "Elliot",
          language: "en",
          speed: VOICE_SPEED,
        },
        ...speech,
      };
    }

    return {
      firstMessage: OPENINGS.english,
      endCallMessage: END_MSG.english,
      endCallPhrases: endCallPhrasesFor("en"),
      variableValues: { preferredLanguage: "English" },
      model: {
        provider: "groq",
        model: "llama-3.3-70b-versatile",
        temperature: 0.55,
        maxTokens: 140,
        messages: [{ role: "system", content: ENGLISH_SYSTEM_PROMPT }],
      },
      voice: {
        provider: "vapi",
        voiceId: "Elliot",
        language: "en",
        speed: VOICE_SPEED,
      },
      ...speech,
    };
  }

  const forceHangupRef = useRef(forceHangupFromUser);
  forceHangupRef.current = forceHangupFromUser;

  function onAssistantLine(text: string) {
    if (!isAssistantGoodbye(text)) return;
    // Don't keep resetting the timer on every partial transcript
    if (endingRef.current && (pendingEndAfterSpeechRef.current || hangupDelayRef.current)) {
      return;
    }
    scheduleCallEndAfterSpeech(2000);
  }

  const onAssistantLineRef = useRef(onAssistantLine);
  onAssistantLineRef.current = onAssistantLine;

  async function startSession(lang: Lang) {
    if (!vapiRef.current || !assistantId) {
      throw new Error(userMsg("configMissing"));
    }
    await vapiRef.current.start(assistantId, buildOverrides(lang) as never);
    maxVapiVolume(vapiRef.current);
  }

  useAutoDismiss(error, () => setError(""));
  useAutoDismiss(info, () => setInfo(""));
  useAutoClearWhen(ended && !active, () => {
    setEnded(false);
    setTranscript([]);
    setInfo("");
  });

  useEffect(() => {
    langRef.current = language;
  }, [language]);

  useEffect(() => {
    if (!publicKey) {
      setError(userMsg("configMissing"));
      return;
    }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;
    maxVapiVolume(vapi);

    vapi.on("audio", (player: HTMLAudioElement) => {
      maxVapiVolume(vapi);
      amplifyAssistantAudio(player);
    });

    vapi.on("call-start", () => {
      endingRef.current = false;
      startedRef.current = true;
      lockSentRef.current = false;
      firstSpeechDoneRef.current = false;
      setConnecting(false);
      setActive(true);
      setEnded(false);
      setError("");
      setTranscript([]);
      resetIdleSteps();
      maxVapiVolume(vapi);
      // Do NOT inject system messages here — it delays / stalls firstMessage TTS.
    });

    vapi.on("speech-start", () => {
      speakingRef.current = true;
      setSpeaking(true);
      clearIdleTimer();
      maxVapiVolume(vapi);
    });

    vapi.on("speech-end", () => {
      speakingRef.current = false;
      setSpeaking(false);
      // Reinforce language lock AFTER opening finishes — keeps first audio fast
      if (!lockSentRef.current && !firstSpeechDoneRef.current) {
        firstSpeechDoneRef.current = true;
        lockSentRef.current = true;
        try {
          const lang = langRef.current;
          vapi.send({
            type: "add-message",
            message: {
              role: "system",
              content: lang === "urdu" ? URDU_LOCK_REINFORCE : ENGLISH_LOCK,
            },
          });
        } catch {
          /* ignore */
        }
      }
      if (pendingEndAfterSpeechRef.current) {
        pendingEndAfterSpeechRef.current = false;
        clearHangupDelay();
        armHangupDelay(2000);
      }
    });

    vapi.on("call-end", () => {
      endingRef.current = true;
      pendingEndAfterSpeechRef.current = false;
      lockSentRef.current = false;
      firstSpeechDoneRef.current = false;
      resetIdleSteps();
      clearHangupDelay();
      setConnecting(false);
      setActive(false);
      setSpeaking(false);
      speakingRef.current = false;
      tearDownVoiceBoost();
      if (startedRef.current) {
        setEnded(true);
        setError("");
        notifyHistoryRefresh();
      }
      startedRef.current = false;
    });

    vapi.on(
      "message",
      (message: {
        type?: string;
        role?: string;
        transcript?: string;
        transcriptType?: string;
        messages?: ConvMsg[];
      }) => {
        if (message.type === "conversation-update" && Array.isArray(message.messages)) {
          const lines = linesFromConversation(message.messages);
          if (lines.length) {
            setTranscript((prev) => mergeTranscript(lines, prev));
            const last = lines[lines.length - 1];
            if (last?.role === "You" && isUserHangupRequest(last.text)) {
              forceHangupRef.current();
            }
            if (last?.role === "Alex") {
              onAssistantLineRef.current(last.text);
            }
          }
          return;
        }

        if (message.type === "transcript" && message.transcript) {
          const role = message.role === "assistant" || message.role === "bot" ? "Alex" : "You";
          const text = message.transcript.trim();
          if (!text) return;
          const isFinal = message.transcriptType === "final";

          // Hangup / goodbye: act on partials too (faster; STT often finalizes late)
          if (role === "You") {
            resetIdleSteps();
            // User still talking → cancel a mistaken goodbye hangup
            if (endingRef.current && !isUserHangupRequest(text) && text.trim().length >= 2) {
              endingRef.current = false;
              pendingEndAfterSpeechRef.current = false;
              clearHangupDelay();
            }
            if (isUserHangupRequest(text)) {
              forceHangupRef.current();
            }
          }
          if (role === "Alex" && isAssistantGoodbye(text)) {
            onAssistantLineRef.current(text);
          }

          if (!isFinal) return;

          if (langRef.current === "urdu" && role === "Alex") {
            // Urdu: don't show noisy STT Alex lines; goodbye already handled above
            return;
          }

          if (role === "You") {
            resetIdleSteps();
          }

          setTranscript((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === role && (text.startsWith(last.text) || last.text.startsWith(text))) {
              return [...prev.slice(0, -1), { role, text }].slice(-60);
            }
            return [...prev, { role, text }].slice(-60);
          });
        }
      }
    );

    vapi.on("error", (e: unknown) => {
      if (endingRef.current) return;

      const msg = errorText(e);
      const hadSession = startedRef.current;

      if (hadSession && (!msg || isBenignHangupError(msg) || msg === "Voice connection error")) {
        endingRef.current = true;
        resetIdleSteps();
        startedRef.current = false;
        setConnecting(false);
        setActive(false);
        setSpeaking(false);
        tearDownVoiceBoost();
        setEnded(true);
        setError("");
        notifyHistoryRefresh();
        return;
      }

      // Failed before/during connect — show connect help, never "call deleted"
      if (!hadSession && isBenignHangupError(msg)) {
        endingRef.current = true;
        resetIdleSteps();
        startedRef.current = false;
        setConnecting(false);
        setActive(false);
        setSpeaking(false);
        tearDownVoiceBoost();
        setEnded(false);
        setError(userMsg("callConnectFail"));
        return;
      }

      endingRef.current = true;
      resetIdleSteps();
      startedRef.current = false;
      setConnecting(false);
      setActive(false);
      setSpeaking(false);
      tearDownVoiceBoost();
      setEnded(false);
      setError(friendlyUserError(msg || userMsg("mic"), "start"));
    });

    setReady(true);

    // Pre-warm mic permission so Start feels instant (no late browser prompt stall)
    void navigator.mediaDevices
      ?.getUserMedia?.({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
      })
      .catch(() => {
        /* user can still allow on Start */
      });

    return () => {
      endingRef.current = true;
      resetIdleSteps();
      clearHangupDelay();
      tearDownVoiceBoost();
      setConnecting(false);
      vapi.stop();
      vapiRef.current = null;
    };
  }, [publicKey]);

  function applyLanguage(next: Lang) {
    // Mid-call live switch locked — only allow before the call starts
    if (active) return;
    if (next === language) return;
    setLanguage(next);
    langRef.current = next;
    try {
      localStorage.setItem("vantora_call_lang", next);
    } catch {
      /* ignore */
    }
    setEnded(false);
    setInfo(UI[next].selectInfo);
  }

  async function toggle() {
    if (!vapiRef.current || !ready) return;

    if (!assistantId) {
      setError(userMsg("configMissing"));
      return;
    }

    if (active) {
      endingRef.current = true;
      resetIdleSteps();
      vapiRef.current.stop();
      return;
    }

    try {
      setError("");
      setInfo("");
      setEnded(false);
      setConnecting(true);
      endingRef.current = false;
      startedRef.current = false;
      lockSentRef.current = false;
      firstSpeechDoneRef.current = false;
      await startSession(langRef.current);
    } catch (e) {
      startedRef.current = false;
      setConnecting(false);
      setActive(false);
      setEnded(false);
      const msg = errorText(e) || (e instanceof Error ? e.message : "");
      // Instant Daily/VAPI teardown should not look like "history call deleted"
      if (isBenignHangupError(msg)) {
        setError(userMsg("callConnectFail"));
        return;
      }
      setError(friendlyUserError(msg || userMsg("mic"), "start"));
    }
  }

  return (
    <section className="panel talk-panel">
      <div className="panel-head">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
        <p className="lede">{copy.lede}</p>
      </div>

      <div className="lang-switch" role="group" aria-label="Call language">
        <span className="lang-label">{copy.langLabel}</span>
        <button
          type="button"
          className={`lang-btn ${language === "english" ? "active" : ""}`}
          onClick={() => applyLanguage("english")}
          disabled={active}
          title={active ? copy.lockedLive : undefined}
        >
          English
        </button>
        <button
          type="button"
          className={`lang-btn ${language === "urdu" ? "active" : ""}`}
          onClick={() => applyLanguage("urdu")}
          disabled={active}
          title={active ? copy.lockedLive : undefined}
        >
          اردو · Urdu
        </button>
        {active && <span className="lang-live">{copy.lockedLive}</span>}
      </div>

      {!active && transcript.length === 0 && (
        <ul className="panel-notes">
          {CALL_AGENT_NOTES.map((note) => (
            <li key={note.title}>
              <strong>{note.title}</strong>
              <span>{note.body}</span>
            </li>
          ))}
        </ul>
      )}

      <div
        className={`pulse-wrap ${active || connecting ? "live" : ""} ${speaking ? "speaking" : ""}`}
      >
        <button
          type="button"
          className={`talk-btn ${active ? "stop" : "start"}`}
          onClick={() => void toggle()}
          disabled={!ready || connecting}
          aria-busy={connecting}
        >
          {active ? copy.end : connecting ? "Connecting…" : copy.start}
        </button>
        <p className="status-line">
          {!ready && copy.loading}
          {ready && connecting && !active && copy.connecting}
          {ready && !connecting && !active && !ended && copy.ready}
          {ready && !connecting && !active && ended && copy.endedStatus}
          {active && speaking && `${copy.speaking} · ${formatElapsed(elapsedSec)}`}
          {active && !speaking && `${copy.listening} · ${formatElapsed(elapsedSec)}`}
        </p>
      </div>

      {error && <p className="error-box">{error}</p>}
      {info && !error && <p className="ok-box">{info}</p>}
      {!error && !info && ended && !active && <p className="ok-box">{copy.endedOk}</p>}

      {transcript.length > 0 && (
        <div className="live-transcript">
          <div className="row between" style={{ marginBottom: "0.65rem" }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              Live transcript
            </p>
            <button
              type="button"
              className="ghost-btn sm"
              onClick={() => {
                const text = transcript.map((l) => `${l.role}: ${l.text}`).join("\n");
                void navigator.clipboard.writeText(text).then(
                  () => setInfo("Live transcript copied."),
                  () => setError("Could not copy transcript.")
                );
              }}
            >
              Copy
            </button>
          </div>
          {transcript.map((line, i) => (
            <p key={`${line.role}-${i}-${line.text.slice(0, 12)}`}>
              <strong>{line.role}:</strong> {line.text}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
