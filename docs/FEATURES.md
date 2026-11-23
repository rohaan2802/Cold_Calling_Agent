# Features — Cold_Calling_Agent (Vantora · Alex)

## Call Agent (browser)

- Start a live voice session in the browser (microphone) without placing a phone call.
- Choose **English** or **Urdu** before the call; language stays locked for the whole session.
- Groq Llama 3.3 + Deepgram Nova-3 + Elliot TTS V2 via VAPI (`TalkToAgent.tsx` + `speechConfig.ts`).
- Natural turn-taking (LiveKit-style endpointing on EN; softer plan on UR).
- Urdu mute recovery: if Elliot stalls, a soft `say` rescue keeps the agent from freezing.

## Outbound dialer

- Enter a US (+1) E.164 number in the UI (`OutboundDialer.tsx`).
- Server route `POST /api/outbound` starts the VAPI phone call with the configured phone number id.
- Free VAPI numbers have daily attempt caps; wallet credits are separate.

## Call History

- Newest-first hybrid list: live VAPI rows badge **`(V)`**, permanent archive rows badge **`(A)`**.
- Filters, search, CSV export.
- **Refresh** performs a hard fetch (`/api/calls?hard=1`) without blanking the list (no page blink).
- **Pull latest recordings** triggers archive sync when tokens/webhook are configured.

## Call detail

- Play archived or live recordings (`AmplifiedPlayer` / native audio).
- View transcript excerpts when available.
- Rename / delete — on Vercel these write through `githubSync.ts` (GitHub Contents API) because the serverless FS is read-only.

## Permanent archive

- End-of-call webhook → GitHub `repository_dispatch` → archive Action → commit under `web/public/call-archive/` → Vercel redeploy.
- Weekly Sunday cron as a safety net; manual Pull for immediate sync.
- Demo WAV seeds keep the history useful for recruiters even without live credits.

## Portfolio presentation

- Root `README.md` + GitHub Pages `index.html` with the same 24 figures (1440×900 / 960×600).
- Light/dark themes, gallery search/filters, lightbox with keyboard and swipe.
