import { NextResponse } from "next/server";
import {
  archivedToVapiCall,
  findArchivedCall,
  isPermanentlyDeleted,
  markPermanentlyDeleted,
  removeArchivedCall,
  renameArchivedCall,
} from "@/lib/archive";
import { pushCallDeleteToGitHub } from "@/lib/githubSync";
import {
  buildHiddenCallsCookie,
  isDeletedCall,
  parseHiddenCallIds,
  vapiFetch,
} from "@/lib/vapi";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (isPermanentlyDeleted(id)) {
      return NextResponse.json({ error: "This call was deleted." }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as { displayName?: string };
    const displayName = String(body.displayName || "").trim();
    if (!displayName) {
      return NextResponse.json({ error: "displayName is required" }, { status: 400 });
    }

    const updated = renameArchivedCall(id, displayName);
    if (!updated) {
      return NextResponse.json(
        { error: "Call not in permanent archive yet. Pull latest recordings first, then rename." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      call: archivedToVapiCall(updated),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const hidden = parseHiddenCallIds(req.headers.get("cookie"));
    if (hidden.has(id) || isPermanentlyDeleted(id)) {
      return NextResponse.json(
        { error: "This call was deleted." },
        { status: 404 }
      );
    }

    const archived = findArchivedCall(id);
    if (archived) {
      return NextResponse.json(archivedToVapiCall(archived));
    }

    // Live VAPI detail only if explicitly allowed (demo mode uses archive only)
    if (process.env.HISTORY_INCLUDE_VAPI === "1") {
      const res = await vapiFetch(`/call/${id}`);
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          { error: data?.message || "Call not found" },
          { status: res.status }
        );
      }
      if (isDeletedCall(data)) {
        return NextResponse.json(
          { error: "This call was deleted. Recording and transcript are no longer available." },
          { status: 404 }
        );
      }
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Permanent delete for demo:
 * - tombstone in call-archive/deleted.json (survives refresh)
 * - remove from archive index + audio file
 * - hide cookie (covers Vercel read-only FS until you push)
 * - best-effort VAPI delete (may fail; UI still treats as gone)
 */
export async function DELETE(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const hidden = parseHiddenCallIds(req.headers.get("cookie"));
    const cookie = buildHiddenCallsCookie(hidden, id);

    const hadArchive = Boolean(findArchivedCall(id));
    let deletedOnVapi = false;
    let lastError = "";

    // Always tombstone first so refresh cannot bring it back from VAPI/archive
    try {
      markPermanentlyDeleted(id);
    } catch {
      /* Vercel FS may be read-only — cookie still hides */
    }

    try {
      removeArchivedCall(id);
    } catch {
      /* ignore */
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await vapiFetch(`/call/${id}`, { method: "DELETE" });
        if (res.ok || res.status === 404) {
          deletedOnVapi = true;
          break;
        }
        try {
          const data = await res.json();
          lastError = String(data?.message || data?.error || `HTTP ${res.status}`);
        } catch {
          lastError = `HTTP ${res.status}`;
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : "VAPI delete failed";
      }
    }

    // Push tombstone + remove audio from GitHub so Vercel stops showing it after redeploy
    let github = { ok: false, detail: "not attempted" };
    try {
      github = await pushCallDeleteToGitHub(id);
    } catch (e) {
      github = {
        ok: false,
        detail: e instanceof Error ? e.message : "GitHub delete failed",
      };
    }

    return NextResponse.json(
      {
        ok: true,
        id,
        deletedOnVapi,
        deletedFromArchive: hadArchive,
        deletedOnGitHub: github.ok,
        permanent: true,
        note: github.ok
          ? undefined
          : github.detail ||
            lastError ||
            "Hidden in UI. Set GITHUB_TOKEN + GITHUB_REPO so Vercel stays in sync.",
      },
      { headers: { "Set-Cookie": cookie } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}