import fs from "fs";
import { NextResponse } from "next/server";
import { findArchiveAudioFile, findArchivedCall, readArchiveIndex } from "@/lib/archive";
import {
  fetchArchiveAudioFromGitHub,
  fetchArchiveIndexFromGitHub,
} from "@/lib/githubSync";
import { includeLiveVapi } from "@/lib/historyMode";
import { isDeletedCall, vapiFetch } from "@/lib/vapi";

type Params = { params: Promise<{ id: string }> };

function streamLocalFile(
  filePath: string,
  contentType: string,
  rangeHeader: string | null
) {
  const stat = fs.statSync(filePath);
  const size = stat.size;

  if (rangeHeader) {
    const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
    if (m) {
      const start = m[1] ? parseInt(m[1], 10) : 0;
      const end = m[2] ? parseInt(m[2], 10) : size - 1;
      if (start <= end && start < size) {
        const chunk = fs.readFileSync(filePath).subarray(start, end + 1);
        return new NextResponse(chunk, {
          status: 206,
          headers: {
            "Content-Type": contentType,
            "Content-Length": String(chunk.length),
            "Content-Range": `bytes ${start}-${end}/${size}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=86400, immutable",
          },
        });
      }
    }
  }

  const buf = fs.readFileSync(filePath);
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}

/**
 * Prefer free permanent archive, then VAPI (which expires ~14 days on free tier).
 */
export async function GET(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const range = req.headers.get("range");

    // 1) Permanent free archive (GitHub/Vercel static — never expires)
    const local = findArchiveAudioFile(id);
    if (local) {
      return streamLocalFile(local.path, local.contentType, range);
    }

    const archived = findArchivedCall(id);
    if (archived?.recordingFile) {
      // Deployed static fallback
      const url = archived.recordingFile.startsWith("/")
        ? archived.recordingFile
        : `/call-archive/${archived.recordingFile}`;
      return NextResponse.redirect(new URL(url, req.url), 302);
    }

    // GitHub main (Action just pushed; Vercel disk may still be old)
    try {
      let recordingFile = archived?.recordingFile;
      if (!recordingFile) {
        const remote = await fetchArchiveIndexFromGitHub();
        recordingFile = remote?.calls?.find((c) => c.id === id)?.recordingFile;
      }
      if (!recordingFile) {
        const localIndex = readArchiveIndex().calls.find((c) => c.id === id);
        recordingFile = localIndex?.recordingFile;
      }
      if (recordingFile) {
        const ghAudio = await fetchArchiveAudioFromGitHub(recordingFile);
        if (ghAudio) {
          return new NextResponse(ghAudio.body, {
            status: 200,
            headers: {
              "Content-Type": ghAudio.contentType,
              "Content-Length": String(ghAudio.body.byteLength),
              "Accept-Ranges": "bytes",
              "Cache-Control": "private, max-age=3600",
            },
          });
        }
      }
    } catch {
      /* fall through to VAPI */
    }

    // Archive-only mode: do not fall back to expiring VAPI audio
    if (!includeLiveVapi()) {
      return NextResponse.json(
        {
          error:
            "Recording not in permanent archive yet. Pull latest recordings, or unset HISTORY_INCLUDE_VAPI=0 for hybrid live+archive.",
        },
        { status: 404 }
      );
    }

    const apiKey = process.env.VAPI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "VAPI_API_KEY missing" }, { status: 500 });
    }

    const auth = { Authorization: `Bearer ${apiKey}` };

    // 2) Fast path: mono-recording from VAPI
    const mono = await fetch(`https://api.vapi.ai/call/${id}/mono-recording`, {
      headers: {
        ...auth,
        ...(range ? { Range: range } : {}),
      },
      redirect: "follow",
      cache: "force-cache",
    });

    if (mono.ok) {
      const contentType = mono.headers.get("content-type") || "audio/mpeg";
      if (!contentType.includes("application/json") && mono.body) {
        const headers = new Headers();
        headers.set("Content-Type", contentType);
        headers.set("Accept-Ranges", "bytes");
        headers.set("Cache-Control", "private, max-age=600, stale-while-revalidate=120");
        const len = mono.headers.get("content-length");
        if (len) headers.set("Content-Length", len);
        const cr = mono.headers.get("content-range");
        if (cr) headers.set("Content-Range", cr);
        return new NextResponse(mono.body, {
          status: mono.status === 206 ? 206 : 200,
          headers,
        });
      }
    }

    // 3) Fallback: call artifact URLs
    const callRes = await vapiFetch(`/call/${id}`);
    if (!callRes.ok) {
      return NextResponse.json({ error: "Call not found" }, { status: callRes.status });
    }
    const call = await callRes.json();
    if (isDeletedCall(call)) {
      return NextResponse.json(
        { error: "Recording deleted with this call." },
        { status: 404 }
      );
    }

    const candidates = [
      call?.artifact?.recording?.mono?.combinedUrl,
      call?.artifact?.recordingUrl,
      call?.artifact?.stereoRecordingUrl,
      call?.artifact?.recording?.stereoUrl,
      call?.artifact?.recording?.mono?.assistantUrl,
    ].filter((u): u is string => typeof u === "string" && u.length > 0);

    for (const url of candidates) {
      try {
        const fileRes = await fetch(url, {
          redirect: "follow",
          headers: range ? { Range: range } : undefined,
          cache: "force-cache",
        });
        if (!fileRes.ok || !fileRes.body) continue;
        const contentType = fileRes.headers.get("content-type") || "audio/mpeg";
        if (contentType.includes("xml") || contentType.includes("json")) continue;

        const headers = new Headers();
        headers.set("Content-Type", contentType);
        headers.set("Accept-Ranges", "bytes");
        headers.set("Cache-Control", "private, max-age=600, stale-while-revalidate=120");
        const len = fileRes.headers.get("content-length");
        if (len) headers.set("Content-Length", len);
        const cr = fileRes.headers.get("content-range");
        if (cr) headers.set("Content-Range", cr);
        return new NextResponse(fileRes.body, {
          status: fileRes.status === 206 ? 206 : 200,
          headers,
        });
      } catch {
        /* try next */
      }
    }

    return NextResponse.json(
      {
        error:
          "Recording not available. If this call is older than ~14 days it may have expired on VAPI — run archive sync earlier next time.",
      },
      { status: 404 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
