# web/ — Cold_Calling_Agent product

Next.js 15 App Router app deployed on Vercel (**Root Directory = `web`**).

This folder is the interactive product. The recruiter case study (README + Pages gallery) lives at the repo root.

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Call Agent + Outbound dialer |
| `/calls` | Call History (hybrid archive + live) |
| `/calls/[id]` | Recording player, transcript, rename/delete |
| `/api/outbound` | Start US phone call via VAPI |
| `/api/webhook` | End-of-call archive trigger |
| `/api/calls` | List / detail / recording APIs |
| `/api/calls/[id]` | GET / PATCH / DELETE one call |
| `/api/calls/[id]/recording` | Audio stream |
| `/api/archive/sync` | Manual Pull of latest recordings |

## Key modules

| File | Role |
|------|------|
| `components/TalkToAgent.tsx` | Browser voice session + language overrides |
| `components/OutboundDialer.tsx` | US phone form |
| `components/CallHistory.tsx` | History UI, filters, hard Refresh |
| `components/CallDetail.tsx` | Player + rename/delete |
| `components/AmplifiedPlayer.tsx` | Recording playback chrome |
| `lib/speechConfig.ts` | Deepgram / turn-taking / voice speed |
| `lib/englishSystemPrompt.ts` / `urduSystemPrompt.ts` | Alex prompts |
| `lib/languageLock.ts` | Lock phrases |
| `lib/githubSync.ts` | GitHub Contents API on read-only Vercel |
| `lib/archive.ts` | Archive index helpers |
| `public/call-archive/` | Permanent audio + `index.json` |

## Environment (summary)

Public: `NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `NEXT_PUBLIC_VAPI_ASSISTANT_ID`  
Secret: `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, optional `GITHUB_TOKEN` + `GITHUB_REPO`  
See root [`.env.example`](../.env.example).

## Run

```bash
# from repo root: copy .env.example → .env first
npm install
npm run dev
npm run build
```

## Docs

- Root [`README.md`](../README.md)
- [`docs/FEATURES.md`](../docs/FEATURES.md)
- [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
