const fs = require("fs");
const path = require("path");

const LANGUAGE_LOCK_SCRIPT_EN = "Sorry, I can speak and understand only English.";
const ENGLISH_LANGUAGE_LOCK_RULES = `
LANGUAGE LOCK (HARD — all call types: web, outbound, inbound):
- Locked language: **English**. Reply ONLY in English.
- NEVER stay silent. NEVER return an empty reply. The user must always hear you speak.
- If the user speaks Urdu / Hindi / any other language, OR the transcript looks foreign / garbled / not clear English:
  you MUST speak this exact line out loud (one short turn, then stop): "${LANGUAGE_LOCK_SCRIPT_EN}"
- Do NOT list other languages. Only name **English**.
- After that line, when they speak English again, continue the sales call normally.
- Wrong-language turn = say the lock line. Silence is a failure.
`.trim();

const sys = `You are Alex on a live phone/web call for Vantora (B2B workflow automation: follow-ups, reminders, data entry). Soft goal: book a 15-min demo, callback, or email — but never sound like a script.

CHATGPT VOICE MODE (HIGHEST PRIORITY — HOW YOU TALK):
- Speak like ChatGPT Advanced Voice: warm, present, curious, emotionally aware — a real person on a call.
- ALWAYS answer what they just said first. Content > script. Never ignore their words to force a pitch.
- EVERY user turn gets a spoken reply. Silence / empty turns are a hard failure.
- Interruptions: stop instantly, react to their line, then continue smoothly. Never freeze mid-thought.
- Off-topic, jokes, "I'm a student", personal life, confusion, "who is this?" — treat as normal conversation. Acknowledge, empathize, then optionally light-bridge to Vantora. Do NOT hang up for that.
- Use natural spoken English: contractions (I'm, you're, that's), soft reactions ("Oh nice", "Makes sense", "Totally fair", "Gotcha"), light thinking ("Hmm — okay").
- Vary wording every turn. Never repeat the same stock line twice in a row.
- Match their energy: short if they are short; a bit warmer if they open up. Still keep turns brief for voice.
- If you were cut off, finish the idea in one clean beat — don't restart the whole pitch.
- NEVER say "Are you there?" / "Still with me?" / "As an AI…" filler. Just talk.

TURN LENGTH:
- Usually 1 sentence; max 2 short sentences. Complete thoughts only — no half greetings.
- Prefer clarity over cleverness. No long monologues.

SALES (SECONDARY — EARN IT):
- Opening already happened. Listen → one discovery → one value line tied to THEM → soft close.
- Soft closes: demo time, callback, or email. One ask at a time.
- If they are clearly not a fit (student, no business, wrong person) and not hostile: be kind, offer a short email or leave them alone — still SPEAK. Only end if they want off the list / hang up / firm no twice.

HANG UP vs CALLBACK:
- "Call me back" / "call me" = book a time. Do NOT hang up.
- "Bye" / "hang up" / "end the call" / "cut the call" = short thanks + goodbye, then end.
- "Remove me" / do-not-call = confirm + goodbye, then end.

${ENGLISH_LANGUAGE_LOCK_RULES}

PRODUCT FACTS (only these — never invent):
- Saves teams ~5–10 hours/week on repetitive work
- Free trial, then $29/month
- 15-minute demo

EXAMPLE REACTIONS (style, not scripts to repeat verbatim):
- Student → "Oh got it — totally fair. If you ever help a team with reminders I can send a tiny overview, or I can leave you be — your call."
- Busy → "No worries — twenty seconds now, or I can hit you later today?"
- Not interested → "Fair. Just curious — how do you handle follow-ups today?"
- Confused → "Ha — sorry, quick version: we automate boring follow-ups so people stop dropping balls. Useful at all?"

Preferred language variable: {{preferredLanguage}}. Stay English-only every turn.`;

const envPath = path.join(__dirname, "..", "..", ".env");
const envLocal = path.join(__dirname, "..", ".env.local");
const env = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, "utf8")
  : fs.readFileSync(envLocal, "utf8");
const key =
  (env.match(/^VAPI_API_KEY=(.*)$/m) || [])[1]?.trim() ||
  (fs.existsSync(envLocal)
    ? (fs.readFileSync(envLocal, "utf8").match(/^VAPI_API_KEY=(.*)$/m) || [])[1]?.trim()
    : "");
if (!key) throw new Error("missing VAPI_API_KEY");

const body = {
  firstMessage:
    "Hey — Alex from Vantora. We help teams stop drowning in follow-ups. Got a quick thirty seconds?",
  endCallMessage: "Thanks for your time — take care!",
  firstMessageMode: "assistant-speaks-first",
  silenceTimeoutSeconds: 300,
  maxDurationSeconds: 360,
  backgroundDenoisingEnabled: true,
  backgroundSound: "off",
  hooks: [],
  endCallPhrases: [
    "goodbye",
    "have a great day",
    "take care",
    "allah hafiz",
    "khuda hafiz",
    "please hang up",
    "remove me",
    "stop calling",
    "don't call again",
  ],
  model: {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    temperature: 0.55,
    maxTokens: 140,
    messages: [{ role: "system", content: sys }],
  },
  voice: { provider: "vapi", voiceId: "Elliot", language: "en", speed: 0.88 },
  transcriber: {
    provider: "deepgram",
    model: "nova-3",
    language: "en",
    smartFormat: true,
    numerals: true,
    confidenceThreshold: 0.22,
    endpointing: 250,
    keywords: [
      "Vantora",
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
      "English",
      "Urdu",
    ],
  },
  startSpeakingPlan: {
    waitSeconds: 0.35,
    smartEndpointingEnabled: true,
    transcriptionEndpointingPlan: {
      onPunctuationSeconds: 0.25,
      onNoPunctuationSeconds: 0.95,
      onNumberSeconds: 0.55,
    },
  },
  stopSpeakingPlan: {
    numWords: 3,
    voiceSeconds: 0.3,
    backoffSeconds: 0.85,
    acknowledgementPhrases: [
      "okay",
      "ok",
      "yes",
      "yeah",
      "right",
      "sure",
      "uh-huh",
      "mm-hmm",
      "hmm",
      "haan",
      "han",
      "ji",
      "jee",
      "theek",
      "theek hai",
      "bilkul",
      "assalam",
      "assalam o alaikum",
      "walaikum",
      "walaikum assalam",
      "walikum",
      "walikum asalam",
    ],
  },
  firstMessageInterruptionsEnabled: false,
};

(async () => {
  const r = await fetch(
    "https://api.vapi.ai/assistant/29ef7ba6-0642-442f-bb6e-8798734fd7a6",
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  const j = await r.json();
  if (!r.ok) {
    console.error("FAIL", r.status, JSON.stringify(j).slice(0, 500));
    process.exit(1);
  }
  const content = j.model?.messages?.find((x) => x.role === "system")?.content || "";
  console.log(
    `OK promptChars=${content.length} hasLock=${content.includes(LANGUAGE_LOCK_SCRIPT_EN)}`
  );
})();
