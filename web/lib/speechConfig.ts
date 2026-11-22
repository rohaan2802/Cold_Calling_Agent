/**
 * Shared STT / turn-taking — snappy replies, natural barge-in, no mid-call freeze.
 * Deepgram default endpointing (10ms) misses short / quiet utterances — use ~250.
 */

/** Natural pace on Elliot V2 — not rushed, not slow */
export const VOICE_SPEED = 0.9;

/** Elliot V2 = more realistic / human TTS (Vapi Voices V2) */
export const VOICE_VERSION = 2 as const;

/** Seconds between idle nudge / end steps (VAPI speech.timeout hooks) — keep long so thinking ≠ “gone” */
export const IDLE_STEP_SECONDS = 25;

const KEYWORDS_EN = [
  "Vantora",
  "Vantora:2",
  "Alex",
  "demo",
  "email",
  "callback",
  "yes",
  "no",
  "okay",
  "ok",
  "hello",
  "interested",
  "busy",
  "call",
  "later",
  "student",
  "student:1",
];

const KEYWORDS_UR = [
  "Vantora",
  "Alex",
  "demo",
  "email",
  "callback",
  "haan",
  "han",
  "ji",
  "jee",
  "theek",
  "bilkul",
  "student",
  "call",
  "cut",
  "busy",
  "mazrat",
  "shukriya",
];

export function deepgramTranscriber(language: "en" | "ur" | "multi") {
  const isUr = language === "ur";
  return {
    provider: "deepgram" as const,
    model: "nova-3" as const,
    language,
    smartFormat: true,
    numerals: true,
    confidenceThreshold: isUr ? 0.15 : 0.22,
    endpointing: isUr ? 400 : 250,
    keywords: isUr ? KEYWORDS_UR : KEYWORDS_EN,
  };
}

/**
 * English: LiveKit smart endpointing (Vapi ChatGPT-like turn detector).
 * Urdu: transcription only (LiveKit English-only) — faster reply after user stops.
 */
export function startSpeakingPlanFor(language: "en" | "ur") {
  if (language === "en") {
    return {
      waitSeconds: 0.4,
      smartEndpointingEnabled: true,
      smartEndpointingPlan: {
        provider: "livekit" as const,
        waitFunction: "2000 / (1 + exp(-10 * (x - 0.5)))",
      },
    };
  }
  return {
    waitSeconds: 0.35,
    smartEndpointingEnabled: false,
    transcriptionEndpointingPlan: {
      onPunctuationSeconds: 0.2,
      onNoPunctuationSeconds: 0.85,
      onNumberSeconds: 0.45,
    },
  };
}

/** @deprecated use startSpeakingPlanFor — kept for any old imports */
export const startSpeakingPlan = startSpeakingPlanFor("en");

const ACK_PHRASES = [
  "okay",
  "ok",
  "yes",
  "yeah",
  "yep",
  "right",
  "sure",
  "uh-huh",
  "uh huh",
  "mm-hmm",
  "mm hmm",
  "mhm",
  "hmm",
  "aha",
  "got it",
  "haan",
  "han",
  "ji",
  "jee",
  "theek",
  "theek hai",
  "bilkul",
  "acha",
  "achha",
  "assalam",
  "assalam o alaikum",
  "walaikum",
  "walaikum assalam",
  "walikum",
  "walikum asalam",
];

/**
 * EN: aggressive ChatGPT-like barge-in.
 * UR: require a few real words — false barge-in was freezing Urdu mid-line.
 */
export function stopSpeakingPlanFor(language: "en" | "ur") {
  if (language === "en") {
    return {
      numWords: 0,
      voiceSeconds: 0.2,
      backoffSeconds: 1.0,
      acknowledgementPhrases: ACK_PHRASES,
    };
  }
  return {
    numWords: 3,
    voiceSeconds: 0.35,
    backoffSeconds: 0.75,
    acknowledgementPhrases: ACK_PHRASES,
  };
}

export const stopSpeakingPlan = stopSpeakingPlanFor("en");

export const IDLE_CHECK_1_EN = "Are you there?";
export const IDLE_CHECK_2_EN = "Still with me?";
export const IDLE_END_EN =
  "It seems you're busy right now — thanks for your time. Have a great day!";

export const IDLE_CHECK_1_UR = "Kya aap line pe hain?";
export const IDLE_CHECK_2_UR = "Aap sun rahe hain?";
export const IDLE_END_UR =
  "Lagta hai aap busy hain — shukriya. Allah hafiz!";

export function idleLines(language: "en" | "ur") {
  if (language === "ur") {
    return {
      check1: IDLE_CHECK_1_UR,
      check2: IDLE_CHECK_2_UR,
      end: IDLE_END_UR,
    };
  }
  return {
    check1: IDLE_CHECK_1_EN,
    check2: IDLE_CHECK_2_EN,
    end: IDLE_END_EN,
  };
}

/**
 * User wants the call hung up now (not a callback request).
 * Handles Roman + Urdu-script STT (nova-3 `ur` often returns Arabic letters).
 */
export function isUserHangupRequest(text: string): boolean {
  const raw = text.trim();
  if (!raw) return false;

  // Urdu / Arabic script forms
  if (
    /کال\s*(کٹ|کت|بند|ختم)/.test(raw) ||
    /(کٹ|کت|بند|ختم)\s*(کر\s*)?(دو|دے|دیں|کرو)/.test(raw) ||
    /فون\s*(رکھ|بند|کٹ)/.test(raw) ||
    /لائن\s*(کٹ|بند)/.test(raw) ||
    /قطع\s*کر/.test(raw)
  ) {
    return true;
  }

  const t = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0600-\u06FF]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return false;

  // Plain callback booking — not hangup
  if (
    /^(ok |theek |haan |ji )?(call|callback) (kr|kar|karo|me|back)/.test(t) &&
    !/(cut|kat|kt|band|hang|end|khatam)/.test(t)
  ) {
    return false;
  }

  // Fuzzy: "call" near cut/kat/kt/band (STT: "call cut kr do", "all kt kr do")
  if (
    /call.{0,12}(cut|kat|kt|band|khatam)/.test(t) ||
    /(cut|kat|kt|band|khatam).{0,12}call/.test(t) ||
    /\ball\s*k[tu]\b/.test(t) ||
    /\bal+\s*k[tu]\b/.test(t) ||
    /\b(cut|kat|kt)\s*(the\s*)?(call|line|phone)?\s*(kr|kar)?\s*(do|deo|karo|krdo)?\b/.test(t) ||
    /\bhang\s*up\b/.test(t) ||
    /\bend\s*(the\s*)?call\b/.test(t) ||
    /\bband\s*(karo|krdo|kr\s*do|kardo|kar\s*do)\b/.test(t) ||
    /\bline\s*(cut|band|kat|kt)\b/.test(t) ||
    /\bphone\s*(rakh|band|cut|kat)\b/.test(t) ||
    /\bdisconnect\b/.test(t) ||
    /\bstop\s*(the\s*)?call\b/.test(t) ||
    /\bbye\s*bye\b/.test(t) ||
    /\b(ok\s*)?bye\b/.test(t) ||
    /\bgood\s*bye\b/.test(t) ||
    /\bgoodbye\b/.test(t)
  ) {
    return true;
  }

  return false;
}

/** Alex said a closing goodbye — hang up ~2s after (Roman + Urdu script).
 * Keep this strict — mid-call “thanks” must NOT kill the conversation.
 */
export function isAssistantGoodbye(text: string): boolean {
  const raw = text.trim();
  if (!raw) return false;
  if (/اللہ\s*حافظ/.test(raw) || /خدا\s*حافظ/.test(raw)) return true;

  const t = raw.toLowerCase().replace(/\s+/g, " ").trim();
  // Explicit farewell only (not generic courtesy lines)
  if (
    /\ballah\s*hafiz\b/.test(t) ||
    /\bkhuda\s*hafiz\b/.test(t) ||
    /\bkhudahafiz\b/.test(t) ||
    /\ballahhafiz\b/.test(t) ||
    /\bgoodbye\b/.test(t) ||
    /\bgood\s*bye\b/.test(t)
  ) {
    return true;
  }
  // Idle / end scripts (full closing lines)
  if (/\bit seems you.?re busy\b/.test(t) && /\b(great day|goodbye|thanks)\b/.test(t)) {
    return true;
  }
  if (/\blagta hai aap\b/.test(t) && /\bbusy\b/.test(t) && /\b(allah|shukriya|hafiz)\b/.test(t)) {
    return true;
  }
  return false;
}

export function endCallPhrasesFor(language: "en" | "ur"): string[] {
  if (language === "ur") {
    return [
      "allah hafiz",
      "khuda hafiz",
      "call khatam",
      "call cut",
      "call kat",
      "call kt",
      "call band",
      "line cut",
      "hang up",
      "end call",
    ];
  }
  return [
    "goodbye",
    "have a great day",
    "please hang up",
    "remove me",
    "stop calling",
    "don't call again",
    "hang up",
    "end call",
    "cut the call",
  ];
}

/**
 * Presence nudges only — NEVER auto endCall on silence for web Call Agent.
 * (Ending on silence made Alex "go quiet forever" / kill mid-conversation.)
 */
export function idlePresenceHooks(language: "en" | "ur", opts?: { endOnSilence?: boolean }) {
  const { check1, check2, end } = idleLines(language);
  const endOnSilence = opts?.endOnSilence !== false;

  // Prefer model response over exact `say` when possible — exact say can stall the LLM loop.
  // Timeouts are long so a pause while thinking does not fire “Are you there?” mid-answer.
  const hooks = [
    {
      on: "customer.speech.timeout" as const,
      name: "idle_check_1",
      options: {
        timeoutSeconds: IDLE_STEP_SECONDS,
        triggerMaxCount: 1,
        triggerResetMode: "onUserSpeech" as const,
      },
      do: [{ type: "say" as const, exact: check1 }],
    },
    {
      on: "customer.speech.timeout" as const,
      name: "idle_check_2",
      options: {
        timeoutSeconds: IDLE_STEP_SECONDS * 2,
        triggerMaxCount: 1,
        triggerResetMode: "onUserSpeech" as const,
      },
      do: [{ type: "say" as const, exact: check2 }],
    },
  ];

  if (!endOnSilence) return hooks;

  return [
    ...hooks,
    {
      on: "customer.speech.timeout" as const,
      name: "idle_end_call",
      options: {
        timeoutSeconds: IDLE_STEP_SECONDS * 4,
        triggerMaxCount: 1,
        triggerResetMode: "onUserSpeech" as const,
      },
      do: [
        { type: "say" as const, exact: end },
        { type: "tool" as const, tool: { type: "endCall" as const } },
      ],
    },
  ];
}

type SpeechOpts = {
  /**
   * Call Agent: idle nudges run in the browser from the live language ref,
   * so Urdu never hears English “Are you there?” from the base assistant hooks.
   */
  clientManagedIdle?: boolean;
  /** Web Call Agent: never hang up only because the user paused */
  endOnSilence?: boolean;
};

/** Overrides shared by web Call Agent + outbound phone */
export function speechCaptureOverrides(
  language: "en" | "ur",
  opts: SpeechOpts = {}
) {
  const clientIdle = Boolean(opts.clientManagedIdle);
  const endOnSilence = opts.endOnSilence !== false;
  // Exact `say` idle hooks ("Are you there?") have repeatedly frozen the LLM/voice
  // loop in production. Never attach them unless we intentionally hang up on silence
  // (phone-only rare path). Web + normal outbound: empty hooks.
  const useSayIdleHooks = !clientIdle && endOnSilence;

  return {
    transcriber: deepgramTranscriber(language),
    startSpeakingPlan: startSpeakingPlanFor(language),
    stopSpeakingPlan: stopSpeakingPlanFor(language),
    backgroundDenoisingEnabled: true,
    /** Never barge into the opening greeting */
    firstMessageInterruptionsEnabled: false,
    // Long pause OK — do not kill calls for thinking time
    silenceTimeoutSeconds: clientIdle || !endOnSilence ? 300 : 90,
    hooks: useSayIdleHooks ? idlePresenceHooks(language, { endOnSilence: true }) : [],
    clientMessages: ["transcript", "conversation-update", "speech-update"] as string[],
  };
}
