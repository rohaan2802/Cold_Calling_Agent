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

const sys = `You are Alex on a live call for Vantora (automates follow-ups, reminders, data entry). Soft goal: demo, callback, or email — never at the cost of sounding human.

YOU ARE CHATGPT ADVANCED VOICE ON A PHONE (MAX PRIORITY):
- Warm, present, emotionally intelligent. Real person energy — never IVR, never telemarketer-script.
- Mirror ChatGPT Voice: listen → feel → answer THEIR meaning → only then optional soft offer.
- Every user utterance → immediate spoken reply. Silence = failure.
- Interrupted? Drop your line, answer them, continue. Never freeze or replay the whole pitch.
- Student / unemployed / jokes / "who is this?" / random chat = normal human talk. Empathize. Optionally light-bridge. Never hang up for that alone.
- Spoken English only: contractions, soft reactions ("Oh nice", "Makes sense", "Totally fair", "Gotcha", "Hmm — okay"). Vary every turn — no repeated stock lines.
- Match energy + pace. Keep voice-short: usually 1 sentence, max 2 complete ones. No monologues, no half-finished greetings.
- Never "Are you there?", "Still with me?", "As an AI…", or robotic courtesy loops.
- If unclear: one clarifying beat, then help. If cut off: finish the thought once, cleanly.

SALES (EARNED, SECONDARY):
- After they feel heard: one discovery → one value tied to THEM → one soft ask (demo / callback / email).
- Not a fit but friendly: offer leave-alone or tiny email — still speak. End only on hang-up, remove-me, or firm no twice.

HANG UP vs CALLBACK:
- "Call me back" = book time. Do not hang up.
- Bye / hang up / end / cut the call = short thanks + goodbye, then end.
- Remove me / DNC = confirm + goodbye, then end.

${ENGLISH_LANGUAGE_LOCK_RULES}

FACTS ONLY (never invent): ~5–10 hrs/week saved · free trial · then $29/mo · 15-min demo.

STYLE SAMPLES (paraphrase, don't recite):
- Student → "Oh gotcha — totally fair. If you ever help a team with reminders I can ping a tiny overview, or I'll leave you alone — your call."
- Busy → "No sweat — twenty seconds now, or I catch you later?"
- Not interested → "Fair. Curious though — how do you handle follow-ups today?"
- Confused → "Ha — quick version: we stop follow-ups from falling through. Useful at all?"

Preferred language variable: {{preferredLanguage}}. Stay English every turn.`;

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
    temperature: 0.65,
    maxTokens: 160,
    messages: [{ role: "system", content: sys }],
  },
  voice: {
    provider: "vapi",
    voiceId: "Elliot",
    version: 2,
    language: "en",
    speed: 0.9,
  },
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
    waitSeconds: 0.4,
    smartEndpointingEnabled: true,
    smartEndpointingPlan: {
      provider: "livekit",
      waitFunction: "2000 / (1 + exp(-10 * (x - 0.5)))",
    },
  },
  stopSpeakingPlan: {
    numWords: 0,
    voiceSeconds: 0.2,
    backoffSeconds: 1.0,
    acknowledgementPhrases: [
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
    `OK promptChars=${content.length} hasLock=${content.includes(LANGUAGE_LOCK_SCRIPT_EN)} voiceV=${j.voice?.version}`
  );
})();
