import fs from "fs";
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { listArchivedAsVapiCalls, readArchiveIndex } from "@/lib/archive";
import { triggerArchiveWorkflow } from "@/lib/githubSync";

export async function POST(req: Request) {
  try {
    const secret = process.env.ARCHIVE_SYNC_SECRET;
    if (secret) {
      const header = req.headers.get("x-archive-secret") || "";
      if (header !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // On Vercel: trigger GitHub Action (cannot write public/ on serverless)
    if (process.env.VERCEL) {
      const github = await triggerArchiveWorkflow("manual-sync-button");
      if (!github.ok) {
        return NextResponse.json(
          {
            error:
              github.detail ||
              "Could not trigger GitHub archive workflow. Add GITHUB_TOKEN + GITHUB_REPO (and repo secret VAPI_API_KEY).",
          },
          { status: 503 }
        );
      }
      return NextResponse.json({
        ok: true,
        mode: "github-dispatch",
        detail:
          "Archive workflow triggered. New recordings appear on Vercel after Action push + deploy (~1–3 min).",
        github,
      });
    }

    const candidates = [
      path.join(process.cwd(), "..", "scripts", "archive-recordings.js"),
      path.join(process.cwd(), "scripts", "archive-recordings.js"),
    ];
    const scriptPath = candidates.find((p) => fs.existsSync(p));
    if (!scriptPath) {
      return NextResponse.json(
        { error: "archive-recordings.js not found" },
        { status: 500 }
      );
    }

    // script lives at <repo>/scripts/archive-recordings.js → repo root is one level up
    const repoRoot = path.resolve(path.dirname(scriptPath), "..");
    const timeoutMs = Number(process.env.ARCHIVE_SYNC_TIMEOUT_MS || 90000);
    const code: number = await new Promise((resolve) => {
      const child = spawn(process.execPath, [scriptPath], {
        cwd: repoRoot,
        stdio: "inherit",
        env: {
          ...process.env,
          ARCHIVE_MAX_PAGES: process.env.ARCHIVE_MAX_PAGES || "3",
        },
      });
      const timer = setTimeout(() => {
        try {
          child.kill();
        } catch {
          /* ignore */
        }
        resolve(124);
      }, timeoutMs);
      child.on("exit", (c) => {
        clearTimeout(timer);
        resolve(c ?? 1);
      });
    });

    if (code === 124) {
      return NextResponse.json(
        {
          error:
            "Archive sync timed out. Demos are safe — try again, or run: npm run archive:quick",
        },
        { status: 504 }
      );
    }

    if (code !== 0) {
      return NextResponse.json({ error: "Archive sync failed" }, { status: 500 });
    }

    // Also push via Actions when token is configured
    let github = { ok: false, detail: "skipped" };
    try {
      github = await triggerArchiveWorkflow("local-sync");
    } catch {
      /* optional */
    }

    const index = readArchiveIndex();
    return NextResponse.json({
      ok: true,
      mode: "local",
      total: index.calls.length,
      updatedAt: index.updatedAt,
      calls: listArchivedAsVapiCalls(),
      github,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const index = readArchiveIndex();
  return NextResponse.json({
    total: index.calls.length,
    updatedAt: index.updatedAt,
    calls: index.calls.map((c) => ({
      id: c.id,
      type: c.type,
      createdAt: c.createdAt,
      recordingFile: c.recordingFile,
      archivedAt: c.archivedAt,
    })),
  });
}
