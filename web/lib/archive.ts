import fs from "fs";
import path from "path";
import type { VapiCall } from "@/lib/vapi";

export type ArchivedCall = {
  id: string;
  type?: string;
  status?: string;
  endedReason?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt?: string;
  cost?: number;
  customer?: { number?: string; name?: string };
  phoneNumberId?: string;
  assistantId?: string;
  transcript?: string;
  summary?: string;
  recordingFile: string;
  archivedAt: string;
  source?: string;
  demo?: boolean;
  permanentDemo?: boolean;
  voiceNote?: string;
  /** User-editable label shown in history / detail */
  displayName?: string;
};

export type ArchiveIndex = {
  updatedAt: string;
  calls: ArchivedCall[];
};

function archiveRoot(): string {
  return path.join(process.cwd(), "public", "call-archive");
}

export function archiveIndexPath(): string {
  return path.join(archiveRoot(), "index.json");
}

export function deletedIdsPath(): string {
  return path.join(archiveRoot(), "deleted.json");
}

export function archiveAudioPath(id: string, ext = "mp3"): string {
  return path.join(archiveRoot(), "audio", `${id}.${ext}`);
}

export function archiveAudioPublicUrl(id: string, ext = "mp3"): string {
  return `/call-archive/audio/${id}.${ext}`;
}

export function readArchiveIndex(): ArchiveIndex {
  try {
    const file = archiveIndexPath();
    if (!fs.existsSync(file)) {
      return { updatedAt: new Date(0).toISOString(), calls: [] };
    }
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const calls = Array.isArray(raw?.calls) ? raw.calls : [];
    return {
      updatedAt: String(raw?.updatedAt || new Date(0).toISOString()),
      calls,
    };
  } catch {
    return { updatedAt: new Date(0).toISOString(), calls: [] };
  }
}

export function writeArchiveIndex(index: ArchiveIndex): void {
  const root = archiveRoot();
  fs.mkdirSync(path.join(root, "audio"), { recursive: true });
  fs.writeFileSync(
    archiveIndexPath(),
    JSON.stringify(
      { updatedAt: new Date().toISOString(), calls: index.calls },
      null,
      2
    ) + "\n",
    "utf8"
  );
}

export function readDeletedIds(): Set<string> {
  try {
    const file = deletedIdsPath();
    if (!fs.existsSync(file)) return new Set();
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const ids = Array.isArray(raw?.ids) ? raw.ids : Array.isArray(raw) ? raw : [];
    return new Set(ids.map(String).filter(Boolean));
  } catch {
    return new Set();
  }
}

export function isPermanentlyDeleted(id: string): boolean {
  return readDeletedIds().has(id);
}

export function markPermanentlyDeleted(id: string): void {
  const ids = readDeletedIds();
  ids.add(id);
  fs.mkdirSync(archiveRoot(), { recursive: true });
  fs.writeFileSync(
    deletedIdsPath(),
    JSON.stringify(
      { updatedAt: new Date().toISOString(), ids: [...ids].slice(-500) },
      null,
      2
    )
  );
}

export function findArchivedCall(id: string): ArchivedCall | null {
  if (isPermanentlyDeleted(id)) return null;
  return readArchiveIndex().calls.find((c) => c.id === id) || null;
}

export function findArchiveAudioFile(
  id: string
): { path: string; contentType: string } | null {
  if (isPermanentlyDeleted(id)) return null;
  const candidates: Array<{ path: string; contentType: string }> = [
    { path: archiveAudioPath(id, "mp3"), contentType: "audio/mpeg" },
    { path: archiveAudioPath(id, "wav"), contentType: "audio/wav" },
    { path: archiveAudioPath(id, "ogg"), contentType: "audio/ogg" },
  ];
  for (const c of candidates) {
    if (fs.existsSync(c.path)) return c;
  }
  return null;
}

export function archivedToVapiCall(row: ArchivedCall): VapiCall {
  const ext = path.extname(row.recordingFile).replace(".", "") || "mp3";
  const url = row.recordingFile.startsWith("/")
    ? row.recordingFile
    : `/call-archive/${row.recordingFile.replace(/^\/+/, "")}`;

  return {
    id: row.id,
    type: row.type,
    status: row.status || "ended",
    endedReason: row.endedReason,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    createdAt: row.createdAt,
    cost: row.cost,
    customer: row.customer,
    assistantId: row.assistantId,
    transcript: row.transcript,
    summary: row.summary,
    recordingUrl: url || archiveAudioPublicUrl(row.id, ext),
    artifact: {
      transcript: row.transcript,
      recordingUrl: url || archiveAudioPublicUrl(row.id, ext),
    },
    demo:
      Boolean(row.demo) ||
      Boolean(row.permanentDemo) ||
      row.source === "demo-seed" ||
      row.id.startsWith("demo-"),
    source: row.source,
    displayName: row.displayName,
  };
}

/** Rename a recording label in the permanent archive (does not rename the audio file id). */
export function renameArchivedCall(
  id: string,
  displayName: string
): ArchivedCall | null {
  const name = displayName.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!name) return null;
  if (isPermanentlyDeleted(id)) return null;

  const index = readArchiveIndex();
  const idx = index.calls.findIndex((c) => c.id === id);
  if (idx < 0) return null;

  const prev = index.calls[idx];
  const next: ArchivedCall = {
    ...prev,
    displayName: name,
    customer: {
      ...(prev.customer || {}),
      name,
      number: prev.customer?.number,
    },
  };
  const calls = [...index.calls];
  calls[idx] = next;
  writeArchiveIndex({ updatedAt: new Date().toISOString(), calls });
  return next;
}

export function listArchivedAsVapiCalls(hidden?: Set<string>): VapiCall[] {
  const deleted = readDeletedIds();
  return readArchiveIndex()
    .calls.filter((c) => !hidden?.has(c.id) && !deleted.has(c.id))
    .filter((c) => Boolean(c.recordingFile))
    .map(archivedToVapiCall);
}

export function upsertArchivedCall(row: ArchivedCall): void {
  if (isPermanentlyDeleted(row.id)) return; // never resurrect deleted ids
  const index = readArchiveIndex();
  const without = index.calls.filter((c) => c.id !== row.id);
  without.unshift(row);
  writeArchiveIndex({ updatedAt: new Date().toISOString(), calls: without });
}

export function removeArchivedCall(id: string): boolean {
  const index = readArchiveIndex();
  const next = index.calls.filter((c) => c.id !== id);
  const removed = next.length !== index.calls.length;
  if (removed) {
    writeArchiveIndex({ updatedAt: new Date().toISOString(), calls: next });
  }
  for (const ext of ["mp3", "wav", "ogg", "webm"]) {
    const p = archiveAudioPath(id, ext);
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  }
  return removed;
}

/** Merge archive + live. Archive wins. Deleted ids never return. */
export function mergeCallsPreferArchive(
  archived: VapiCall[],
  live: VapiCall[],
  deleted?: Set<string>
): VapiCall[] {
  const ban = deleted || readDeletedIds();
  const map = new Map<string, VapiCall>();
  for (const c of live) {
    if (!ban.has(c.id)) map.set(c.id, c);
  }
  for (const c of archived) {
    if (!ban.has(c.id)) map.set(c.id, c);
  }
  return [...map.values()].sort((a, b) => {
    const ta = new Date(a.createdAt || a.startedAt || 0).getTime();
    const tb = new Date(b.createdAt || b.startedAt || 0).getTime();
    return tb - ta;
  });
}