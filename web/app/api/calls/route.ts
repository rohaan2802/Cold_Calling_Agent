import { NextResponse } from "next/server";
import {
  listArchivedAsVapiCalls,
  mergeCallsPreferArchive,
  readDeletedIds,
} from "@/lib/archive";
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

    // Default: GitHub/archive files ONLY (no VAPI list = no 14-day expiry / no duplicates)
    // Set HISTORY_INCLUDE_VAPI=1 only if you want live VAPI rows merged in.
    const includeVapi = process.env.HISTORY_INCLUDE_VAPI === "1";

    let live: VapiCall[] = [];
    if (includeVapi) {
      try {
        live = await fetchRecordedCalls(hidden, deleted);
      } catch (err) {
        if (!archived.length) throw err;
      }
    }

    const calls = mergeCallsPreferArchive(archived, live, deleted).slice(0, MAX_LISTED);

    return NextResponse.json(calls, {
      headers: {
        "Cache-Control": "private, max-age=8, stale-while-revalidate=30",
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