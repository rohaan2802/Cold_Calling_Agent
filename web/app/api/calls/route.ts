import { NextResponse } from "next/server";
import {
  listArchivedAsVapiCalls,
  mergeCallsPreferArchive,
  readDeletedIds,
} from "@/lib/archive";
import { includeLiveVapi } from "@/lib/historyMode";
import {
  parseHiddenCallIds,
  shouldListInHistory,
  vapiFetch,
  type VapiCall,
} from "@/lib/vapi";

const PAGE_SIZE = 100;
const MAX_PAGES = 8;
const MAX_LISTED = 100;

async function fetchRecordedCalls(hidden: Set<string>, deleted: Set<string>): Promise<VapiCall[]> {
  const listed: VapiCall[] = [];
  let createdAtLt: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (createdAtLt) qs.set("createdAtLt", createdAtLt);

    const res = await vapiFetch(`/call?${qs.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      throw Object.assign(new Error(data?.message || "Failed to fetch calls"), {
        status: res.status,
        data,
      });
    }

    const raw: VapiCall[] = Array.isArray(data) ? data : data?.results || [];
    if (!raw.length) break;

    for (const c of raw) {
      if (deleted.has(c.id) || hidden.has(c.id)) continue;
      if (shouldListInHistory(c)) {
        listed.push(c);
        if (listed.length >= MAX_LISTED) return listed;
      }
    }

    const oldest = raw[raw.length - 1]?.createdAt;
    if (!oldest || raw.length < PAGE_SIZE) break;
    createdAtLt = oldest;
  }

  return listed;
}

export async function GET(req: Request) {
  try {
    const hidden = parseHiddenCallIds(req.headers.get("cookie"));
    const deleted = readDeletedIds();
    const archived = listArchivedAsVapiCalls(hidden);

    // Hybrid (default): live VAPI now + archive preferred on same id when present.
    // Opt out with HISTORY_INCLUDE_VAPI=0 (archive-only).
    let live: VapiCall[] = [];
    if (includeLiveVapi()) {
      try {
        live = await fetchRecordedCalls(hidden, deleted);
      } catch (err) {
        if (!archived.length) throw err;
      }
    }

    const calls = mergeCallsPreferArchive(archived, live, deleted).slice(0, MAX_LISTED);

    return NextResponse.json(calls, {
      headers: {
        "Cache-Control": "private, max-age=3, stale-while-revalidate=15",
      },
    });
  } catch (err) {
    const status =
      err && typeof err === "object" && "status" in err
        ? Number((err as { status: number }).status) || 500
        : 500;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status });
  }
}