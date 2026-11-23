# Architecture — Cold_Calling_Agent (Vantora · Alex)

Recruiter-facing map of how the product is structured. Product source of truth: `web/`. Case study: root `index.html` + `assets/`.

## Surfaces

| Surface | Entry | Role |
|---------|-------|------|
| Home | `web/app/page.tsx` | Call Agent + Outbound dialer shell |
| Call Agent | `web/components/TalkToAgent.tsx` | Browser mic sessions with EN/UR language lock |
| Outbound dialer | `web/components/OutboundDialer.tsx` + `web/app/api/outbound/route.ts` | Server-side VAPI phone call start (US +1) |
| Call History | `web/app/calls/page.tsx` + `CallHistory.tsx` | Hybrid list: live VAPI `(V)` + archive `(A)` |
| Call detail | `web/app/calls/[id]/page.tsx` + `CallDetail.tsx` | Recording player, transcript, rename/delete |
| Portfolio site | `index.html` + `assets/` | GitHub Pages case study |

## Voice stack (runtime)

```
Browser mic / PSTN phone
        │
        ▼
      VAPI  ──► Deepgram Nova-3 (STT)
        │
        ├──► Groq Llama 3.3 (LLM, per-language overrides)
        │
        └──► Elliot TTS V2 (EN native; UR = Roman Urdu Latin)
```

Config highlights:

- `speechConfig.ts` — endpointing, keywords, idle timing, voice speed `0.9`
- `englishSystemPrompt.ts` / `urduSystemPrompt.ts` — Alex sales + never-silent rules
- `languageLock.ts` — lock phrases injected once per call
- `TalkToAgent.tsx` — `buildOverrides(lang)` for model/voice/transcriber

## API map

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/calls` | Hybrid history list (`hard=1` for no-cache refresh) |
| `GET` | `/api/calls/[id]` | Call metadata + transcript fields |
| `PATCH` / `DELETE` | `/api/calls/[id]` | Rename / delete (GitHub-backed on Vercel) |
| `GET` | `/api/calls/[id]/recording` | Audio stream / redirect |
| `POST` | `/api/outbound` | Start outbound US call |
| `POST` | `/api/webhook` | VAPI end-of-call → archive dispatch |
| `POST` | `/api/archive/sync` | Manual Pull (optional secret) |

## Permanent archive pipeline

```
end-of-call webhook  →  GitHub Action  →  push audio + index.json  →  Vercel redeploy
         ↑                    ↑
   /api/webhook         weekly cron + UI Pull button
```

- Storage: `web/public/call-archive/index.json` + `audio/`
- Tombstones: `deleted.json`
- Vercel FS is read-only → `githubSync.ts` uses GitHub Contents API for rename/delete

## History semantics

| Badge | Meaning |
|-------|---------|
| `(A)` | Permanent archive (GitHub → Vercel public files) |
| `(V)` | Live VAPI row (may expire with provider retention) |

`HISTORY_INCLUDE_VAPI=1` (default) merges live + archive; set `0` for archive-only.

## Deploy topology

| Piece | Where |
|-------|--------|
| Product UI + APIs | Vercel project, Root Directory = `web` |
| Portfolio site | GitHub Pages from repo root (`index.html`) |
| Archive commits | GitHub Actions on this repository |

## Verify locally

```bash
cd web
npm install
npm run build
npm run dev
```

Then: Call Agent → end call → Call History → optional Pull → Refresh.
