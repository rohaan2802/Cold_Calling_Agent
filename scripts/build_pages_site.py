# -*- coding: utf-8 -*-
"""Build detailed recruiter README + index.html from figures.json."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIGS = json.loads((ROOT / "assets" / "figures.json").read_text(encoding="utf-8"))["figures"]

REPO = "https://github.com/rohaan2802/Cold_Calling_Agent"
PAGES = "https://rohaan2802.github.io/Cold_Calling_Agent/"
DEMO = "https://web-rouge-xi-23.vercel.app"


def readme() -> str:
    shots = []
    for f in FIGS:
        n = f["id"]
        shots.append(
            f"### {n}. {f['title']}\n\n"
            f'<p align="left"><a href="assets/screenshots/{f["file"]}">'
            f'<img src="assets/thumbs/{f["file"]}" alt="{f["title"]}" width="720"></a></p>\n\n'
            f"*{f['caption']}*\n"
        )

    return f"""<div align="center">

# Cold_Calling_Agent

**Vantora · Alex — production-style AI cold-calling voice agent with browser calls, US outbound dialer, English/Urdu lock, recordings, and a free permanent archive.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=nextdotjs&logoColor=white)]({REPO}/tree/main/web)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)]({REPO}/tree/main/web)
[![VAPI](https://img.shields.io/badge/Voice-VAPI-0f766e?style=for-the-badge)]({REPO})
[![Groq](https://img.shields.io/badge/LLM-Groq%20Llama%203.3-f55036?style=for-the-badge)]({REPO})
[![Deepgram](https://img.shields.io/badge/STT-Deepgram%20Nova--3-13ef93?style=for-the-badge&logoColor=black)]({REPO})
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000?style=for-the-badge&logo=vercel)]({DEMO})
[![GitHub Actions](https://img.shields.io/badge/CI-Archive%20Workflow-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)]({REPO}/tree/main/.github/workflows)
[![Pages](https://img.shields.io/badge/Pages-Case%20study-222?style=for-the-badge&logo=githubpages)]({PAGES})
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live-Open%20Demo-0ea5e9?style=for-the-badge&logo=googlechrome&logoColor=white)]({DEMO})

</div>

---

## Live Links

| What | Link |
|------|------|
| Repository | [{REPO}]({REPO}) |
| Website (GitHub Pages) | [{PAGES}]({PAGES}) |
| Live product demo (Vercel) | [{DEMO}]({DEMO}) |

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

1. Open [{DEMO}]({DEMO}) (or local `npm run dev`).
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

Same 24 figures appear on the [GitHub Pages gallery]({PAGES}#gallery). Click a preview for the full **1440 × 900** image. Previews are **960 × 600**, left-aligned.

{chr(10).join(shots)}

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
"""


def gallery_html() -> str:
    parts = []
    for f in FIGS:
        parts.append(
            f'<figure class="shot reveal" data-cat="{f["category"]}" data-full="assets/screenshots/{f["file"]}">'
            f'<button type="button" aria-label="Open {f["title"]}">'
            f'<div class="thumb"><img src="assets/thumbs/{f["file"]}" alt="{f["title"]}" loading="lazy" width="960" height="600"></div>'
            f'<figcaption>{f["title"]}<span>{f["caption"]}</span></figcaption>'
            f"</button></figure>"
        )
    return "\n".join(parts)


def index_html() -> str:
    gal = gallery_html()
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Cold_Calling_Agent · Vantora · Alex | Mohammad Rohaan</title>
<meta name="description" content="Detailed case study: AI cold-calling voice agent with browser + outbound, English/Urdu lock, recordings archive, APIs, and setup.">
<meta name="author" content="Mohammad Rohaan">
<meta name="theme-color" content="#0b1220">
<link rel="canonical" href="{PAGES}">
<meta property="og:type" content="website">
<meta property="og:title" content="Cold_Calling_Agent — Vantora · Alex">
<meta property="og:description" content="Production-style AI voice cold caller: web + outbound, bilingual, archived recordings.">
<meta property="og:url" content="{PAGES}">
<meta property="og:image" content="{PAGES}assets/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<script>(function(){{try{{var t=localStorage.getItem('vantora-theme');var q=new URLSearchParams(location.search).get('theme');if(q==='dark'||q==='light')t=q;if(!t)t='dark';document.documentElement.setAttribute('data-theme',t);}}catch(e){{document.documentElement.setAttribute('data-theme','dark');}}}})();</script>
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="nav">
<div class="container nav-inner">
<a class="brand" href="#top" aria-label="Vantora Alex home"><span class="brand-logo" aria-hidden="true">VA</span><span>Vantora · Alex</span></a>
<ul class="nav-links" id="nav-links">
<li><a href="#links">Links</a></li>
<li><a href="#overview">Overview</a></li>
<li><a href="#features">Features</a></li>
<li><a href="#inside">Inside</a></li>
<li><a href="#architecture">Architecture</a></li>
<li><a href="#setup">Setup</a></li>
<li><a href="#demo">Demo</a></li>
<li><a href="#gallery">Screenshots</a></li>
<li><a href="#results">Results</a></li>
<li><a href="#limits">Limits</a></li>
<li><a href="#author">Author</a></li>
</ul>
<button class="icon-btn menu-btn" id="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav-links">
<svg class="ico-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
<svg class="ico-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
</button>
<button class="icon-btn theme-btn" id="theme-toggle" type="button" aria-label="Toggle theme" title="Toggle light / dark">
<svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.5 15.2A8.2 8.2 0 0 1 8.8 3.5 9.6 9.6 0 1 0 20.5 15.2z"/></svg>
<svg class="sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.4" fill="currentColor"/><g stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 1.4v2.6M12 20v2.6M1.4 12h2.6M20 12h2.6M4.4 4.4l1.9 1.9M17.7 17.7l1.9 1.9M4.4 19.6l1.9-1.9M17.7 6.3l1.9-1.9"/></g></svg>
</button>
</div>
</header>
<main id="main">
<div class="hero" id="top">
<div class="container">
<span class="eyebrow">Vantora · Alex · Next.js + VAPI</span>
<h1>Cold_Calling_Agent</h1>
<p class="lead">Detailed recruiter case study for an AI outbound voice agent: live browser calls, US outbound dialer, English/Urdu language lock, recordings with transcripts, hybrid history, and a free permanent archive on GitHub/Vercel.</p>
<div class="badges">
<a href="{REPO}/tree/main/web" target="_blank" rel="noopener"><img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&amp;logo=nextdotjs&amp;logoColor=white" alt="Next.js 15" height="28"></a>
<a href="{REPO}/tree/main/web" target="_blank" rel="noopener"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&amp;logo=typescript&amp;logoColor=white" alt="TypeScript" height="28"></a>
<a href="{REPO}" target="_blank" rel="noopener"><img src="https://img.shields.io/badge/Voice-VAPI-0f766e?style=for-the-badge" alt="VAPI" height="28"></a>
<a href="{REPO}" target="_blank" rel="noopener"><img src="https://img.shields.io/badge/LLM-Groq-f55036?style=for-the-badge" alt="Groq" height="28"></a>
<a href="{REPO}" target="_blank" rel="noopener"><img src="https://img.shields.io/badge/STT-Deepgram-13ef93?style=for-the-badge" alt="Deepgram" height="28"></a>
<a href="{DEMO}" target="_blank" rel="noopener"><img src="https://img.shields.io/badge/Deploy-Vercel-000?style=for-the-badge&amp;logo=vercel" alt="Vercel" height="28"></a>
<a href="{PAGES}" target="_blank" rel="noopener"><img src="https://img.shields.io/badge/Pages-Case_study-222?style=for-the-badge&amp;logo=githubpages" alt="Pages" height="28"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-a16207?style=for-the-badge" alt="MIT" height="28"></a>
</div>
<div class="cta">
<a class="btn btn-primary" href="{REPO}" target="_blank" rel="noopener">View on GitHub</a>
<a class="btn btn-ghost" href="{DEMO}" target="_blank" rel="noopener">Open live demo</a>
<a class="btn btn-ghost" href="{REPO}/archive/refs/heads/main.zip">Download ZIP</a>
</div>
<div class="stats">
<div class="stat"><b>2</b><span>Languages (EN/UR)</span></div>
<div class="stat"><b>3</b><span>Call surfaces</span></div>
<div class="stat"><b>24</b><span>Portfolio figures</span></div>
<div class="stat"><b>Free</b><span>Permanent archive</span></div>
</div>
</div>
</div>

<section id="links"><div class="container">
<h2 class="reveal">Live Links</h2>
<p class="sub reveal">Three primary HTTPS destinations for reviewers.</p>
<div class="table-wrap reveal"><table>
<thead><tr><th>What</th><th>Link</th></tr></thead>
<tbody>
<tr><td>Repository</td><td><a href="{REPO}" target="_blank" rel="noopener">{REPO}</a></td></tr>
<tr><td>Website (GitHub Pages)</td><td><a href="{PAGES}" target="_blank" rel="noopener">{PAGES}</a></td></tr>
<tr><td>Live product demo (Vercel)</td><td><a href="{DEMO}" target="_blank" rel="noopener">{DEMO}</a></td></tr>
</tbody>
</table></div>
</div></section>

<section id="overview"><div class="container">
<h2 class="reveal">Overview</h2>
<div class="reveal">
<p><strong>Cold_Calling_Agent</strong> packages a working cold-calling voice product and a portfolio presentation. The interactive app lives under <code>web/</code> (Vercel). This site is the recruiter-facing GitHub Pages case study with the same figures as the README.</p>
<p>It demonstrates production voice patterns: VAPI orchestration, Deepgram STT, Groq Llama 3.3, Elliot TTS, hybrid call history, and a free permanent recording archive that survives provider retention.</p>
<div class="grid">
<div class="card"><span class="tag">Product</span><h3>Call Agent</h3><p>Browser mic sessions with English or Urdu lock and natural turn-taking.</p></div>
<div class="card"><span class="tag">Telephony</span><h3>Outbound dialer</h3><p>Place real +1 calls through a VAPI phone number when credits allow.</p></div>
<div class="card"><span class="tag">Ops</span><h3>Permanent archive</h3><p>Webhook / Pull / weekly cron → GitHub → Vercel <code>(A)</code> badges.</p></div>
<div class="card"><span class="tag">Stack</span><h3>Next.js · VAPI · Groq</h3><p>Deepgram Nova-3 STT, Llama 3.3, Elliot TTS V2.</p></div>
</div>
</div></div></section>

<section id="features"><div class="container">
<h2 class="reveal">Features</h2>
<p class="sub reveal">What a recruiter can exercise in the live demo and verify in source.</p>
<div class="table-wrap reveal"><table>
<thead><tr><th>Feature</th><th>Detail</th></tr></thead>
<tbody>
<tr><td>Browser Call Agent</td><td>Mic session without placing a phone call</td></tr>
<tr><td>English / Urdu lock</td><td>Chosen before start; locked for the whole call</td></tr>
<tr><td>Turn-taking</td><td>Deepgram endpointing + EN LiveKit-style plan</td></tr>
<tr><td>Urdu mute recovery</td><td>Soft <code>say</code> rescue if Elliot stalls</td></tr>
<tr><td>Outbound US dialer</td><td><code>POST /api/outbound</code> with E.164 validation</td></tr>
<tr><td>Hybrid history</td><td><code>(A)</code> archive + <code>(V)</code> live VAPI rows</td></tr>
<tr><td>Hard Refresh</td><td>Reloads data without blanking the UI</td></tr>
<tr><td>Rename / delete on Vercel</td><td>GitHub Contents API via <code>githubSync.ts</code></td></tr>
</tbody>
</table></div>
<p class="reveal">Full notes: <a href="{REPO}/blob/main/docs/FEATURES.md" target="_blank" rel="noopener">docs/FEATURES.md</a></p>
</div></section>

<section id="inside"><div class="container">
<h2 class="reveal">What's Inside</h2>
<p class="sub reveal">Source of truth for demos and code review.</p>
<div class="table-wrap reveal"><table>
<thead><tr><th>Path</th><th>Role</th></tr></thead>
<tbody>
<tr><td><code>web/</code></td><td>Next.js 15 app (UI + API routes)</td></tr>
<tr><td><code>web/components/TalkToAgent.tsx</code></td><td>Browser Call Agent + language overrides</td></tr>
<tr><td><code>web/components/OutboundDialer.tsx</code></td><td>US outbound phone form</td></tr>
<tr><td><code>web/lib/*SystemPrompt.ts</code></td><td>English / Urdu Alex prompts</td></tr>
<tr><td><code>web/lib/speechConfig.ts</code></td><td>STT / turn-taking / voice speed</td></tr>
<tr><td><code>scripts/</code></td><td>Archive sync, demo seed, figure generator</td></tr>
<tr><td><code>docs/</code></td><td>Features, architecture, assessment</td></tr>
<tr><td><code>assets/</code></td><td>Pages theme + 24 screenshots</td></tr>
</tbody>
</table></div>
</div></section>

<section id="breakdown"><div class="container">
<h2 class="reveal">Project Breakdown</h2>
<div class="table-wrap reveal"><table>
<thead><tr><th>Area</th><th>Shipped</th></tr></thead>
<tbody>
<tr><td>Call Agent</td><td>EN/UR lock, turn-taking, Urdu mute recovery</td></tr>
<tr><td>Outbound</td><td><code>POST /api/outbound</code> with US validation</td></tr>
<tr><td>History</td><td>Filters, CSV, hard Refresh without blink</td></tr>
<tr><td>Archive</td><td>Webhook + Pull + Sunday cron → GitHub</td></tr>
<tr><td>Portfolio</td><td>README + Pages + 24 figures</td></tr>
</tbody>
</table></div>
</div></section>

<section id="tech"><div class="container">
<h2 class="reveal">Tech Stack</h2>
<div class="table-wrap reveal"><table>
<thead><tr><th>Layer</th><th>Choice</th></tr></thead>
<tbody>
<tr><td>UI / API</td><td>Next.js 15 + TypeScript</td></tr>
<tr><td>Voice</td><td>VAPI (web + phone)</td></tr>
<tr><td>STT</td><td>Deepgram Nova-3</td></tr>
<tr><td>LLM</td><td>Groq Llama 3.3</td></tr>
<tr><td>TTS</td><td>Elliot TTS V2</td></tr>
<tr><td>Hosting</td><td>Vercel product · GitHub Pages case study</td></tr>
<tr><td>Archive</td><td>GitHub Actions + Contents API</td></tr>
</tbody>
</table></div>
</div></section>

<section id="architecture"><div class="container">
<h2 class="reveal">Architecture</h2>
<p class="sub reveal">Voice: Browser/Phone → VAPI → Deepgram → Groq → Elliot. Ops: webhook → GitHub Action → call-archive → Vercel.</p>
<pre class="tree reveal">web/
├── app/page.tsx · calls/ · api/outbound · api/webhook · api/calls · api/archive/sync
├── components/TalkToAgent · OutboundDialer · CallHistory · CallDetail
└── lib/speechConfig · englishSystemPrompt · urduSystemPrompt · githubSync · archive</pre>
<p class="reveal">Full write-up: <a href="{REPO}/blob/main/docs/ARCHITECTURE.md" target="_blank" rel="noopener">docs/ARCHITECTURE.md</a></p>
<div class="table-wrap reveal"><table>
<thead><tr><th>Badge</th><th>Meaning</th></tr></thead>
<tbody>
<tr><td><code>(A)</code></td><td>Permanent archive on GitHub/Vercel</td></tr>
<tr><td><code>(V)</code></td><td>Live VAPI row (may expire with provider retention)</td></tr>
</tbody>
</table></div>
</div></section>

<section id="api"><div class="container">
<h2 class="reveal">API Reference</h2>
<p class="sub reveal">App Router routes under <code>web/app/api</code>.</p>
<div class="table-wrap reveal"><table>
<thead><tr><th>Method</th><th>Path</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td>GET</td><td><code>/api/calls</code></td><td>Hybrid history (<code>hard=1</code> no-cache)</td></tr>
<tr><td>GET</td><td><code>/api/calls/[id]</code></td><td>Metadata + transcript</td></tr>
<tr><td>PATCH / DELETE</td><td><code>/api/calls/[id]</code></td><td>Rename / delete</td></tr>
<tr><td>GET</td><td><code>/api/calls/[id]/recording</code></td><td>Audio stream</td></tr>
<tr><td>POST</td><td><code>/api/outbound</code></td><td>Start US outbound call</td></tr>
<tr><td>POST</td><td><code>/api/webhook</code></td><td>End-of-call archive dispatch</td></tr>
<tr><td>POST</td><td><code>/api/archive/sync</code></td><td>Manual Pull</td></tr>
</tbody>
</table></div>
</div></section>

<section id="env"><div class="container">
<h2 class="reveal">Environment Variables</h2>
<p class="sub reveal">Copy <code>.env.example</code> → <code>.env</code>. Never commit secrets.</p>
<div class="table-wrap reveal"><table>
<thead><tr><th>Variable</th><th>Scope</th><th>Role</th></tr></thead>
<tbody>
<tr><td><code>NEXT_PUBLIC_VAPI_PUBLIC_KEY</code></td><td>Public</td><td>Browser VAPI SDK</td></tr>
<tr><td><code>NEXT_PUBLIC_VAPI_ASSISTANT_ID</code></td><td>Public</td><td>Web assistant id</td></tr>
<tr><td><code>VAPI_API_KEY</code></td><td>Secret</td><td>Outbound, webhook, archive</td></tr>
<tr><td><code>VAPI_PHONE_NUMBER_ID</code></td><td>Secret</td><td>Outbound caller id</td></tr>
<tr><td><code>GITHUB_TOKEN</code> · <code>GITHUB_REPO</code></td><td>Secret</td><td>Rename/delete + archive push</td></tr>
<tr><td><code>HISTORY_INCLUDE_VAPI</code></td><td>Server</td><td><code>1</code> hybrid (default)</td></tr>
</tbody>
</table></div>
</div></section>

<section id="setup"><div class="container">
<h2 class="reveal">Setup</h2>
<p class="sub reveal">Local run for reviewers with Node 20+.</p>
<div class="code-wrap reveal"><div class="code-bar"><span class="code-label">bash</span><button type="button" class="copy">Copy</button></div>
<pre class="code"><code>git clone https://github.com/rohaan2802/Cold_Calling_Agent.git
cd Cold_Calling_Agent
copy .env.example .env
cd web &amp;&amp; npm install &amp;&amp; npm run dev</code></pre></div>
<p class="reveal">Windows: use <code>RUN.cmd</code>. Vercel Root Directory must be <code>web</code>. Point VAPI webhook to <code>/api/webhook</code>.</p>
</div></section>

<section id="demo"><div class="container">
<h2 class="reveal">Demo</h2>
<ol class="reveal">
<li>Open the <a href="{DEMO}" target="_blank" rel="noopener">live demo</a>.</li>
<li>Pick English or Urdu → start Call Agent → allow mic.</li>
<li>End call → Call History → optional Pull → Refresh for <code>(A)</code>.</li>
<li>Open a recording → play → rename (GitHub-backed on Vercel).</li>
<li>Optional: try Outbound with a US +1 number if credits allow.</li>
</ol>
</div></section>

<section id="testing"><div class="container">
<h2 class="reveal">Testing Checklist</h2>
<div class="table-wrap reveal"><table>
<thead><tr><th>Step</th><th>Expected</th></tr></thead>
<tbody>
<tr><td>Live demo loads</td><td>Call Agent + Outbound visible</td></tr>
<tr><td>EN Call Agent</td><td>Lock, natural replies, clean hangup</td></tr>
<tr><td>UR Call Agent</td><td>Roman Urdu; mute recovery if needed</td></tr>
<tr><td>History Refresh</td><td>Badges update without UI blink</td></tr>
<tr><td><code>npm run build</code></td><td>Production build succeeds</td></tr>
<tr><td>Pages gallery</td><td>Same 24 figures as README</td></tr>
</tbody>
</table></div>
</div></section>

<section id="gallery"><div class="container">
<h2 class="reveal">Screenshots</h2>
<p class="sub reveal">Same 24 figures as the README — code, architecture, and product outputs. Search and filter; click to zoom.</p>
<div class="toolbar reveal">
<label class="search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span class="hide">Search</span><input id="search" type="search" placeholder="Search figures…" aria-label="Search figures"></label>
<button type="button" class="chip" data-filter="all" aria-pressed="true">All</button>
<button type="button" class="chip" data-filter="overview" aria-pressed="false">Overview</button>
<button type="button" class="chip" data-filter="product" aria-pressed="false">Product</button>
<button type="button" class="chip" data-filter="architecture" aria-pressed="false">Architecture</button>
<button type="button" class="chip" data-filter="code" aria-pressed="false">Code</button>
<button type="button" class="chip" data-filter="ops" aria-pressed="false">Ops</button>
<button type="button" class="chip" data-filter="results" aria-pressed="false">Results</button>
</div>
<div class="gallery" id="gallery-grid">
{gal}
</div>
<p id="no-results" class="empty">No figures match.</p>
</div></section>

<section id="results"><div class="container">
<h2 class="reveal">Results</h2>
<div class="table-wrap reveal"><table>
<thead><tr><th>Check</th><th>Status</th></tr></thead>
<tbody>
<tr><td>Live Vercel demo</td><td>Pass</td></tr>
<tr><td>EN / UR Call Agent</td><td>Pass</td></tr>
<tr><td>Archive webhook / Action</td><td>Pass</td></tr>
<tr><td>24 figures (1440×900 + 960×600)</td><td>Pass</td></tr>
</tbody>
</table></div>
</div></section>

<section id="limits"><div class="container">
<h2 class="reveal">Limitations &amp; Troubleshooting</h2>
<ul class="reveal">
<li>VAPI wallet credits are not daily-renewing; free US numbers cap outbound attempts/day.</li>
<li>Elliot TTS is English-first; Urdu uses Roman Urdu (Latin script).</li>
<li>Vercel FS is read-only — rename/delete need GitHub tokens.</li>
<li>GitHub Pages is the portfolio site; the product runs on Vercel.</li>
</ul>
<div class="table-wrap reveal"><table>
<thead><tr><th>Symptom</th><th>Likely fix</th></tr></thead>
<tbody>
<tr><td>Call Agent won’t start</td><td>Check <code>NEXT_PUBLIC_VAPI_*</code> + mic permission</td></tr>
<tr><td>Stuck on <code>(V)</code></td><td>Pull / webhook Action + <code>VAPI_API_KEY</code> secret</td></tr>
<tr><td>Rename fails on Vercel</td><td>Set <code>GITHUB_TOKEN</code> + <code>GITHUB_REPO</code></td></tr>
<tr><td>Outbound rejected</td><td>Daily free-number limit or missing phone id</td></tr>
</tbody>
</table></div>
</div></section>

<section id="author"><div class="container">
<h2 class="reveal">About the Author</h2>
<div class="author-card reveal">
<div class="author-avatar" aria-hidden="true">MR</div>
<div>
<p><strong>Mohammad Rohaan</strong> — BS Computer Science</p>
<p>Builder of voice AI demos, Next.js products, and recruiter-ready case studies.</p>
<p>GitHub <a href="https://github.com/rohaan2802" target="_blank" rel="noopener">@rohaan2802</a> · <a href="mailto:m.rohaanarshad@gmail.com">m.rohaanarshad@gmail.com</a></p>
<p><a class="btn btn-ghost" href="{REPO}" target="_blank" rel="noopener">Star on GitHub</a></p>
</div>
</div>
</div></section>
</main>

<footer><div class="container">
<p>MIT-licensed application code · Built for recruiter review · <a href="{REPO}">Cold_Calling_Agent</a></p>
</div></footer>

<button type="button" class="icon-btn to-top" id="to-top" aria-label="Back to top">
<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.2 4.2 12.5h4.3V21h7V12.5h4.3L12 3.2z"/></svg>
</button>

<div class="lb" id="lightbox" role="dialog" aria-modal="true" aria-label="Screenshot viewer">
<button type="button" class="lb-btn close" aria-label="Close">×</button>
<button type="button" class="lb-btn prev" aria-label="Previous">‹</button>
<button type="button" class="lb-btn next" aria-label="Next">›</button>
<img alt="">
<p></p>
</div>
<script src="assets/js/main.js"></script>
</body>
</html>
"""


def main() -> None:
    (ROOT / "README.md").write_text(readme(), encoding="utf-8")
    (ROOT / "index.html").write_text(index_html(), encoding="utf-8")
    print("Wrote detailed README.md + index.html")


if __name__ == "__main__":
    main()
