import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { triggerArchiveWorkflow } from "@/lib/githubSync";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const message = payload?.message || payload;

    if (message?.type && message.type !== "end-of-call-report") {
      return NextResponse.json({ ok: true, ignored: message.type });
    }

    const call = message?.call || {};
    const artifact = message?.artifact || call?.artifact || {};

    const record = {
      savedAt: new Date().toISOString(),
      callId: call?.id,
      type: call?.type,
      status: call?.status,
      endedReason: message?.endedReason || call?.endedReason,
      customerNumber: call?.customer?.number,
      startedAt: call?.startedAt,
      endedAt: call?.endedAt,
      transcript: artifact?.transcript || call?.transcript || "",
      recording: artifact?.recording || artifact?.recordingUrl || null,
      summary: call?.analysis?.summary || call?.summary || null,
    };

    try {
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const file = path.join(dataDir, "call-log.json");
      const existing = fs.existsSync(file)
        ? JSON.parse(fs.readFileSync(file, "utf8"))
        : [];
      existing.unshift(record);
      fs.writeFileSync(file, JSON.stringify(existing.slice(0, 200), null, 2));
    } catch {
      // Vercel serverless may be read-only
    }

    // Local: pull into web/public/call-archive right away
    if (!process.env.VERCEL) {
      try {
        const script = path.join(process.cwd(), "..", "scripts", "archive-recordings.js");
        if (fs.existsSync(script)) {
          spawn(process.execPath, [script], {
            cwd: path.join(process.cwd(), ".."),
            detached: true,
            stdio: "ignore",
            env: {
              ...process.env,
              ARCHIVE_MAX_PAGES: process.env.ARCHIVE_MAX_PAGES || "2",
            },
          }).unref();
        }
      } catch {
        /* ignore */
      }
    }

    // Production + local: ask GitHub Actions to archive + push → Vercel redeploy
    let github: { ok: boolean; detail: string } = {
      ok: false,
      detail: "not attempted",
    };
    try {
      github = await triggerArchiveWorkflow(
        call?.id ? `end-of-call:${call.id}` : "end-of-call"
      );
    } catch (err) {
      github = {
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      };
    }

    return NextResponse.json({
      ok: true,
      archivedLocalHint: !process.env.VERCEL,
      githubDispatch: github,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
