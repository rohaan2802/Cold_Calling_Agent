/**
 * Language lock — applies to web Call Agent, outbound, and inbound once a language is set.
 * Never go silent: always speak the lock line in the locked language.
 */

export const LANGUAGE_LOCK_SCRIPT_EN =
  "Sorry, I can speak and understand only English.";

/** Khalis Roman Urdu — no English words (Urdu mode lock line) */
export const LANGUAGE_LOCK_SCRIPT_UR =
  "Mazrat, main sirf Urdu hi bolta aur samajhta hoon.";

/** Block appended to English system prompt (web / outbound / inbound default). */
export const ENGLISH_LANGUAGE_LOCK_RULES = `
LANGUAGE LOCK (HARD — all call types: web, outbound, inbound):
- Locked language: **English**. Reply ONLY in English.
- NEVER stay silent. NEVER return an empty reply. The user must always hear you speak.
- If the user speaks Urdu / Hindi / any other language, OR the transcript looks foreign / garbled / not clear English:
  you MUST speak this exact line out loud (one short turn, then stop): "${LANGUAGE_LOCK_SCRIPT_EN}"
- Do NOT list other languages. Only name **English**.
- After that line, when they speak English again, continue the sales call normally.
- Wrong-language turn = say the lock line. Silence is a failure.
`.trim();

/** Block appended to Urdu system prompt. */
export const URDU_LANGUAGE_LOCK_RULES = `
LANGUAGE LOCK (Urdu call):
- Jawab SIRF **Roman Urdu** (Latin). English idle sentences MAT ("Are you there", "Sorry", …).
- Kabhi chup MAT. Empty reply FORBIDDEN.
- Roman Urdu / Arabic-script Urdu / mix / broken STT = valid — MEANING pe jawab do, lock MAT lagaao.
- Lock line SIRF jab user clearly long full-English sentence bole (3+ English words sales se alag):
  bolo: "${LANGUAGE_LOCK_SCRIPT_UR}" — phir TURANT next Urdu turn pe continue. Lock ke baad silent MAT.
- Short fillers (ok, yes, email, demo, Vantora, hello, haan) pe lock mat.
- Kabhi "Sorry" mat — **Mazrat**.
`.trim();
