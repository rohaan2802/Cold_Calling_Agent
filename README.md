<div align="center">

# Cold_Calling_Agent

**Vantora · Alex — production-style AI cold-calling voice agent with browser calls, US outbound dialer, English/Urdu lock, recordings, and a free permanent archive.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://github.com/rohaan2802/Cold_Calling_Agent/tree/main/web)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://github.com/rohaan2802/Cold_Calling_Agent/tree/main/web)
[![VAPI](https://img.shields.io/badge/Voice-VAPI-0f766e?style=for-the-badge)](https://github.com/rohaan2802/Cold_Calling_Agent)
[![Groq](https://img.shields.io/badge/LLM-Groq%20Llama%203.3-f55036?style=for-the-badge)](https://github.com/rohaan2802/Cold_Calling_Agent)
[![Deepgram](https://img.shields.io/badge/STT-Deepgram%20Nova--3-13ef93?style=for-the-badge&logoColor=black)](https://github.com/rohaan2802/Cold_Calling_Agent)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000?style=for-the-badge&logo=vercel)](https://web-rouge-xi-23.vercel.app)
[![GitHub Actions](https://img.shields.io/badge/CI-Archive%20Workflow-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/rohaan2802/Cold_Calling_Agent/tree/main/.github/workflows)
[![Pages](https://img.shields.io/badge/Pages-Case%20study-222?style=for-the-badge&logo=githubpages)](https://rohaan2802.github.io/Cold_Calling_Agent/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live-Open%20Demo-0ea5e9?style=for-the-badge&logo=googlechrome&logoColor=white)](https://web-rouge-xi-23.vercel.app)

</div>

---

## Live Links

| What | Link |
|------|------|
| Repository | [https://github.com/rohaan2802/Cold_Calling_Agent](https://github.com/rohaan2802/Cold_Calling_Agent) |
| Website (GitHub Pages) | [https://rohaan2802.github.io/Cold_Calling_Agent/](https://rohaan2802.github.io/Cold_Calling_Agent/) |
| Live product demo (Vercel) | [https://web-rouge-xi-23.vercel.app](https://web-rouge-xi-23.vercel.app) |

---

## Table of Contents

1. [Live Links](#live-links)
2. [Overview](#overview)
3. [Features](#features)
4. [What's Inside](#whats-inside)
5. [Project Breakdown](#project-breakdown)
6. [Tech Stack](#tech-stack)
7. [Architecture](#architecture)
8. [API Reference](#api-reference)
9. [Call History Badges](#call-history-badges)
10. [Folder Structure](#folder-structure)
11. [Environment Variables](#environment-variables)
12. [Setup](#setup)
13. [Demo Walkthrough](#demo-walkthrough)
14. [Inputs, Methods, Outputs](#inputs-methods-outputs)
15. [Testing Checklist](#testing-checklist)
16. [Results](#results)
17. [Screenshots](#screenshots)
18. [Limitations](#limitations)
19. [Troubleshooting](#troubleshooting)
20. [License](#license)
21. [About the Author](#about-the-author)

---

## Overview

**Cold_Calling_Agent** is an end-to-end outbound voice sales demo branded **Vantora** with agent **Alex**. Recruiters can review:

1. **Live product** on Vercel (real mic / optional phone calls)
2. **Source code** under `web/` (Next.js 15 App Router)
3. **Case study site** on GitHub Pages (this README’s companion gallery)

The stack demonstrates production patterns used in modern voice AI: real-time orchestration (VAPI), cloud STT (Deepgram), fast LLM inference (Groq), neural TTS (Elliot), hybrid call history, and a free permanent recording archive that survives provider retention limits.

Related docs:

- [`docs/FEATURES.md`](docs/FEATURES.md) — feature-by-feature product notes
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — surfaces, APIs, deploy topology
- [`docs/ASSESSMENT_DETAILED.md`](docs/ASSESSMENT_DETAILED.md) — longer assessment write-up
- [`web/README.md`](web/README.md) — app-only quick map

---

## Features

| Feature | Detail |
|---------|--------|
| Browser Call Agent | Mic session, no phone required for demos |
| English / Urdu lock | Chosen before start; locked for entire call |
| Natural turn-taking | Deepgram endpointing + LiveKit-style EN plan |
| Urdu mute recovery | Soft `say` rescue if Elliot stalls |
| Outbound US dialer | `POST /api/outbound` with E.164 validation |
| Hybrid Call History | `(A)` archive + `(V)` live VAPI rows |
| Hard Refresh | Reloads data without blanking the UI |
| Recordings + transcripts | Detail page player + text when available |
| Rename / delete on Vercel | GitHub Contents API via `githubSync.ts` |
| Permanent archive | Webhook + Pull + weekly cron → GitHub → Vercel |
| Portfolio Pages | Light/dark, gallery, 24 figures matching README |

---

## What's Inside

| Section | Path | Contents |
|---------|------|----------|
| Web product | [`web/`](web/) | Next.js 15 UI, API routes, prompts, archive assets |
| Call Agent | [`web/components/TalkToAgent.tsx`](web/components/TalkToAgent.tsx) | Browser voice + language overrides |
| Outbound UI | [`web/components/OutboundDialer.tsx`](web/components/OutboundDialer.tsx) | Phone form + dial actions |
| History | [`web/components/CallHistory.tsx`](web/components/CallHistory.tsx) | Hybrid `(A)` / `(V)` list + hard refresh |
| Detail | [`web/components/CallDetail.tsx`](web/components/CallDetail.tsx) | Player, rename, delete |
| Prompts | [`englishSystemPrompt.ts`](web/lib/englishSystemPrompt.ts) · [`urduSystemPrompt.ts`](web/lib/urduSystemPrompt.ts) | Alex sales + lock rules |
| Speech | [`web/lib/speechConfig.ts`](web/lib/speechConfig.ts) | Deepgram / turn-taking / voice speed |
| Archive ops | [`githubSync.ts`](web/lib/githubSync.ts) · [`.github/workflows/`](.github/workflows/) | Rename/delete + cron/webhook sync |
| Docs | [`docs/`](docs/) | Features, architecture, assessment |
| Pages site | [`index.html`](index.html) · [`assets/`](assets/) | Recruiter gallery (same 24 figures) |

---

## Project Breakdown

| Area | What shipped |
|------|----------------|
| Call Agent | EN/UR lock, natural turn-taking, Urdu mute recovery |
| Outbound | `POST /api/outbound` with US phone validation |
| History | Newest-first, filters, CSV export, Refresh without blink |
| Detail | Recording player, transcript, rename/delete (GitHub-backed on Vercel) |
| Archive | Webhook + Pull + weekly cron → GitHub → Vercel `(A)` badges |
| Ops | Env separation (public vs secret), Actions, Vercel root = `web` |
| Portfolio | README + Pages site + 24 code/output figures |

---

## Tech Stack

| Layer | Choice | Why it matters |
|-------|--------|----------------|
| UI / API | Next.js 15 (App Router) + TypeScript | Single deployable product on Vercel |
| Voice orchestration | VAPI | Web + phone assistants, webhooks |
| STT | Deepgram Nova-3 | Low-latency transcription |
| LLM | Groq Llama 3.3 | Fast replies for natural conversation |
| TTS | VAPI Elliot V2 | Human-like English; Roman Urdu for UR mode |
| Hosting | Vercel (product) + GitHub Pages (case study) | Split demo vs portfolio |
| Archive | GitHub Actions + Contents API | Free permanence after VAPI expiry |

---

## Architecture

**Voice path:** Browser/Phone → VAPI → Deepgram STT → Groq Llama 3.3 → Elliot TTS.

**Ops path:** end-of-call webhook → GitHub Action → `web/public/call-archive/` → Vercel redeploy.

```
web/
├── app/page.tsx · calls/ · api/outbound · api/webhook · api/calls · api/archive/sync
├── components/TalkToAgent · OutboundDialer · CallHistory · CallDetail
└── lib/speechConfig · englishSystemPrompt · urduSystemPrompt · githubSync · archive
```

Full write-up: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## API Reference

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/calls` | Hybrid history (`?hard=1` = no-cache refresh) |
| `GET` | `/api/calls/[id]` | Metadata + transcript fields |
| `PATCH` / `DELETE` | `/api/calls/[id]` | Rename / delete (GitHub-backed on Vercel) |
| `GET` | `/api/calls/[id]/recording` | Audio stream |
| `POST` | `/api/outbound` | Start outbound US call |
| `POST` | `/api/webhook` | VAPI end-of-call → archive dispatch |
| `POST` | `/api/archive/sync` | Manual Pull (optional `ARCHIVE_SYNC_SECRET`) |

---

## Call History Badges

| Badge | Meaning |
|-------|---------|
| `(A)` | Permanent archive file on GitHub/Vercel |
| `(V)` | Live VAPI row (provider retention may expire media) |

Default hybrid mode: `HISTORY_INCLUDE_VAPI=1`. Set to `0` for archive-only history.

---

## Folder Structure

```
Cold_Calling_Agent/
├── index.html · .nojekyll     # GitHub Pages case study
├── assets/                    # CSS/JS + 24 screenshots (1440×900 / 960×600)
├── web/                       # Next.js product (Vercel Root Directory = web)
│   ├── app/                   # pages + API routes
│   ├── components/            # TalkToAgent, OutboundDialer, CallHistory, CallDetail
│   ├── lib/                   # prompts, speech, archive, githubSync
│   └── public/call-archive/   # permanent recordings + index.json
├── scripts/                   # archive sync, seed, figures, Pages builder
├── prompts/ · docs/ · config/
├── .github/workflows/         # recording archive Action
├── RUN.cmd · package.json · LICENSE
└── .env.example               # placeholders only (never commit secrets)
```

---

## Environment Variables

Copy [`.env.example`](.env.example) → `.env` (and Vercel project env).

| Variable | Scope | Role |
|----------|-------|------|
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | Public | Browser VAPI SDK |
| `NEXT_PUBLIC_VAPI_ASSISTANT_ID` | Public | Assistant id for web calls |
| `VAPI_API_KEY` | Secret | Server outbound + webhook + archive |
| `VAPI_PHONE_NUMBER_ID` | Secret | Outbound caller id |
| `GROQ_API_KEY` | Secret / VAPI | LLM (often configured in VAPI dashboard) |
| `APP_URL` | Server | Canonical deployed URL for webhooks |
| `GITHUB_TOKEN` · `GITHUB_REPO` | Secret | Archive rename/delete + push |
| `ARCHIVE_SYNC_SECRET` | Optional | Protects manual Pull |
| `HISTORY_INCLUDE_VAPI` | Server | `1` hybrid (default), `0` archive-only |

Never commit real `.env` files.

---

## Setup

**Requirements:** Node 20+, Git, VAPI account, Groq (via VAPI). Optional GitHub PAT for archive rename/delete on Vercel.

```bash
git clone https://github.com/rohaan2802/Cold_Calling_Agent.git
cd Cold_Calling_Agent
copy .env.example .env
cd web
npm install
npm run dev
```

Windows one-click: double-click [`RUN.cmd`](RUN.cmd).

**Deploy**

1. Import repo on Vercel → set **Root Directory = `web`**
2. Add the same env vars
3. Set VAPI Server URL / webhook to `https://<your-app>/api/webhook`
4. Enable GitHub Pages from branch `main` / root for the case study site

---

## Demo Walkthrough

1. Open [https://web-rouge-xi-23.vercel.app](https://web-rouge-xi-23.vercel.app) (or local `npm run dev`).
2. Choose **English** or **Urdu** → **Call Agent** → allow microphone → talk ~30–60s.
3. End call → **Call History** → confirm the new row (`(V)` until archived).
4. Optional: **Pull latest recordings** → wait ~1 minute → **Refresh** → badge `(A)`.
5. Open a call → play recording → rename (GitHub-backed on Vercel).
6. Optional: try **Outbound** with a US +1 number if credits/limits allow.

---

## Inputs, Methods, Outputs

| | Detail |
|--|--------|
| **Inputs** | Browser mic or E.164 US phone, language choice, VAPI + Groq credentials |
| **Methods** | VAPI orchestration · Deepgram Nova-3 · Groq Llama 3.3 · Elliot TTS V2 · Next.js 15 · GitHub Actions archive |
| **Saved outputs** | `web/public/call-archive/index.json` + audio · History rows · optional CSV |
| **Verification** | `npm run build` · live Call Agent · History refresh · archive Pull when tokens configured |

Saved archive fixtures are committed for demos; live checks depend on VAPI credits.

---

## Testing Checklist

| Step | Expected |
|------|----------|
| Open live demo | Home loads; Call Agent + Outbound visible |
| Call Agent English | Lock before call; natural replies; clean hangup |
| Call Agent Urdu | Roman Urdu only; mute recovery if TTS stalls |
| Call History | New row appears; Refresh updates badges |
| Pull + Refresh | `(A)` after archive Action completes |
| Detail page | Audio plays; rename persists on Vercel with tokens |
| `npm run build` | Next.js production build succeeds |
| Pages site | `index.html` gallery shows same 24 figures |

Outbound E2E may be blocked by free-number daily caps even when wallet credits remain.

---

## Results

| Check | Status |
|-------|--------|
| Live Vercel demo | Pass |
| EN Call Agent + prompts | Pass |
| UR Call Agent + mute recovery | Pass (retest after each deploy) |
| Outbound API | Pass (credits + free-number daily caps apply) |
| Archive webhook / Action | Pass |
| GitHub Pages files | Pass (`index.html` + `assets/`) |
| Figure set 24 × 1440×900 + 24 × 960×600 | Pass |

---

## Screenshots

Same 24 figures appear on the [GitHub Pages gallery](https://rohaan2802.github.io/Cold_Calling_Agent/#gallery). Click a preview for the full **1440 × 900** image. Previews are **960 × 600**, left-aligned.

### 1. Repository folder structure

<p align="left"><a href="assets/screenshots/01_repo_folder_structure.png"><img src="assets/thumbs/01_repo_folder_structure.png" alt="Repository folder structure" width="720"></a></p>

*Top-level map of web/, scripts/, docs/, prompts/, and CI.*

### 2. Voice pipeline architecture

<p align="left"><a href="assets/screenshots/02_voice_pipeline_architecture.png"><img src="assets/thumbs/02_voice_pipeline_architecture.png" alt="Voice pipeline architecture" width="720"></a></p>

*Browser/phone through VAPI, Deepgram, Groq, and Elliot TTS.*

### 3. Call Agent — English UI

<p align="left"><a href="assets/screenshots/03_call_agent_english_ui_mock.png"><img src="assets/thumbs/03_call_agent_english_ui_mock.png" alt="Call Agent — English UI" width="720"></a></p>

*Browser voice UI mock with language lock and notes from TalkToAgent.*

### 4. Call Agent — Urdu language lock

<p align="left"><a href="assets/screenshots/04_call_agent_urdu_language_lock.png"><img src="assets/thumbs/04_call_agent_urdu_language_lock.png" alt="Call Agent — Urdu language lock" width="720"></a></p>

*Roman Urdu rules and TTS constraints for Elliot.*

### 5. Outbound dialer flow

<p align="left"><a href="assets/screenshots/05_outbound_dialer_flow.png"><img src="assets/thumbs/05_outbound_dialer_flow.png" alt="Outbound dialer flow" width="720"></a></p>

*Steps from phone input through POST /api/outbound to VAPI call.*

### 6. Call History (A)/(V) badges

<p align="left"><a href="assets/screenshots/06_call_history_av_badges.png"><img src="assets/thumbs/06_call_history_av_badges.png" alt="Call History (A)/(V) badges" width="720"></a></p>

*Hybrid live VAPI vs permanent archive badge semantics.*

### 7. Permanent archive pipeline

<p align="left"><a href="assets/screenshots/07_permanent_archive_pipeline.png"><img src="assets/thumbs/07_permanent_archive_pipeline.png" alt="Permanent archive pipeline" width="720"></a></p>

*Webhook → GitHub Action → push → Vercel redeploy.*

### 8. Recording player & transcript

<p align="left"><a href="assets/screenshots/08_recording_player_transcript.png"><img src="assets/thumbs/08_recording_player_transcript.png" alt="Recording player & transcript" width="720"></a></p>

*Playback chrome with transcript excerpt from archive.*

### 9. englishSystemPrompt excerpt

<p align="left"><a href="assets/screenshots/09_english_system_prompt_excerpt.png"><img src="assets/thumbs/09_english_system_prompt_excerpt.png" alt="englishSystemPrompt excerpt" width="720"></a></p>

*First lines of English Alex system prompt from repo.*

### 10. urduSystemPrompt excerpt

<p align="left"><a href="assets/screenshots/10_urdu_system_prompt_excerpt.png"><img src="assets/thumbs/10_urdu_system_prompt_excerpt.png" alt="urduSystemPrompt excerpt" width="720"></a></p>

*Urdu prompt rules: Roman Urdu and never-silent.*

### 11. speechConfig turn-taking

<p align="left"><a href="assets/screenshots/11_speech_config_turn_taking.png"><img src="assets/thumbs/11_speech_config_turn_taking.png" alt="speechConfig turn-taking" width="720"></a></p>

*LiveKit endpointing (EN) vs Urdu transcription plan.*

### 12. TalkToAgent buildOverrides

<p align="left"><a href="assets/screenshots/12_talk_to_agent_build_overrides.png"><img src="assets/thumbs/12_talk_to_agent_build_overrides.png" alt="TalkToAgent buildOverrides" width="720"></a></p>

*Per-language Groq model and Elliot voice overrides.*

### 13. Outbound API route

<p align="left"><a href="assets/screenshots/13_outbound_api_route_snippet.png"><img src="assets/thumbs/13_outbound_api_route_snippet.png" alt="Outbound API route" width="720"></a></p>

*Server route that starts VAPI phone calls.*

### 14. Webhook end-of-call archive

<p align="left"><a href="assets/screenshots/14_webhook_end_of_call_archive.png"><img src="assets/thumbs/14_webhook_end_of_call_archive.png" alt="Webhook end-of-call archive" width="720"></a></p>

*end-of-call-report handler and GitHub dispatch.*

### 15. githubSync on read-only Vercel

<p align="left"><a href="assets/screenshots/15_github_sync_rename_delete_vercel.png"><img src="assets/thumbs/15_github_sync_rename_delete_vercel.png" alt="githubSync on read-only Vercel" width="720"></a></p>

*Rename/delete via GitHub when Vercel FS cannot write.*

### 16. Next.js App Router map

<p align="left"><a href="assets/screenshots/16_nextjs_app_router_map.png"><img src="assets/thumbs/16_nextjs_app_router_map.png" alt="Next.js App Router map" width="720"></a></p>

*app/, components/, and lib/ responsibilities.*

### 17. Environment variables

<p align="left"><a href="assets/screenshots/17_env_vars_public_vs_secret.png"><img src="assets/thumbs/17_env_vars_public_vs_secret.png" alt="Environment variables" width="720"></a></p>

*Public NEXT_PUBLIC_* vs server secrets (.env.example).*

### 18. Demo archive seed overview

<p align="left"><a href="assets/screenshots/18_demo_call_archive_seed_overview.png"><img src="assets/thumbs/18_demo_call_archive_seed_overview.png" alt="Demo archive seed overview" width="720"></a></p>

*call-archive index and demo-wav seed files.*

### 19. Mobile Call History badges

<p align="left"><a href="assets/screenshots/19_mobile_call_history_badges_row.png"><img src="assets/thumbs/19_mobile_call_history_badges_row.png" alt="Mobile Call History badges" width="720"></a></p>

*Responsive badge row and source styling.*

### 20. Hard refresh (no blink)

<p align="left"><a href="assets/screenshots/20_refresh_hard_fetch_no_blink.png"><img src="assets/thumbs/20_refresh_hard_fetch_no_blink.png" alt="Hard refresh (no blink)" width="720"></a></p>

*CallHistory hard fetch without blanking the list.*

### 21. Local setup & Vercel

<p align="left"><a href="assets/screenshots/21_setup_npm_run_vercel.png"><img src="assets/thumbs/21_setup_npm_run_vercel.png" alt="Local setup & Vercel" width="720"></a></p>

*npm install, RUN.cmd, and deployment steps.*

### 22. Testing checklist

<p align="left"><a href="assets/screenshots/22_testing_checklist_en_ur_outbound.png"><img src="assets/thumbs/22_testing_checklist_en_ur_outbound.png" alt="Testing checklist" width="720"></a></p>

*EN/UR verified items and outbound limit note.*

### 23. Known limitations

<p align="left"><a href="assets/screenshots/23_limitations_credits_elliot_urdu.png"><img src="assets/thumbs/23_limitations_credits_elliot_urdu.png" alt="Known limitations" width="720"></a></p>

*Credits, outbound caps, and Elliot Urdu TTS.*

### 24. Results summary

<p align="left"><a href="assets/screenshots/24_results_summary_recruiter.png"><img src="assets/thumbs/24_results_summary_recruiter.png" alt="Results summary" width="720"></a></p>

*Shipped features and live links for recruiters.*


---

## Limitations

- VAPI wallet credits are not daily-renewing; free US numbers also cap outbound attempts/day.
- Elliot TTS is English-first; Urdu is spoken as **Roman Urdu** (Latin script).
- Vercel FS is read-only — rename/delete need `GITHUB_TOKEN` + `GITHUB_REPO`.
- GitHub Pages is the portfolio site; the interactive product runs on Vercel.
- International dialing is out of scope for the free US number path.

---

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| Call Agent won’t start | Check `NEXT_PUBLIC_VAPI_*` and browser mic permission |
| No history rows | Confirm `HISTORY_INCLUDE_VAPI` and VAPI key; try Refresh |
| Stuck on `(V)` | Pull recordings / wait for webhook Action; verify `VAPI_API_KEY` in Actions secrets |
| Rename fails on Vercel | Set `GITHUB_TOKEN` + `GITHUB_REPO` |
| Urdu sounds broken / silent | Keep replies Roman Urdu only (no Arabic script) |
| Outbound rejected | Free-number daily limit or missing `VAPI_PHONE_NUMBER_ID` |

---

## License

MIT — see [`LICENSE`](LICENSE).

---

## About the Author

**Mohammad Rohaan** · BS Computer Science

- GitHub: [@rohaan2802](https://github.com/rohaan2802)
- Email: [m.rohaanarshad@gmail.com](mailto:m.rohaanarshad@gmail.com)

If this portfolio piece helped, a ⭐ on the repo is appreciated.
