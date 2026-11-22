/**
 * Free forever archive: pull recordings from VAPI → web/public/call-archive/
 * Survives VAPI's ~14-day free retention. Served as static files on free Vercel.
 *
 * Usage (from repo root):
 *   node scripts/archive-recordings.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const ROOT = path.join(__dirname, "..");
const WEB = path.join(ROOT, "web");
const ARCHIVE = path.join(WEB, "public", "call-archive");
const AUDIO_DIR = path.join(ARCHIVE, "audio");
const INDEX_FILE = path.join(ARCHIVE, "index.json");
const DELETED_FILE = path.join(ARCHIVE, "deleted.json");

function loadEnvFile(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function getApiKey() {
  const root = loadEnvFile(path.join(ROOT, ".env"));
  const web = loadEnvFile(path.join(WEB, ".env.local"));
  const key = process.env.VAPI_API_KEY || web.VAPI_API_KEY || root.VAPI_API_KEY;
  if (!key || key.includes("your_")) {
    throw new Error("VAPI_API_KEY missing. Put it in root .env or web/.env.local");
  }
  return key;
}


function readDeletedIds() {
  if (!fs.existsSync(DELETED_FILE)) return new Set();
  try {
    const raw = JSON.parse(fs.readFileSync(DELETED_FILE, "utf8"));
    const ids = Array.isArray(raw?.ids) ? raw.ids : [];
    return new Set(ids.map(String));
  } catch {
    return new Set();
  }
}

function readIndex() {
  if (!fs.existsSync(INDEX_FILE)) return { updatedAt: new Date(0).toISOString(), calls: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
    return { updatedAt: raw.updatedAt || new Date(0).toISOString(), calls: Array.isArray(raw.calls) ? raw.calls : [] };
  } catch {
    return { updatedAt: new Date(0).toISOString(), calls: [] };
  }
}

function writeIndex(calls) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  const payload = { updatedAt: new Date().toISOString(), calls };
  fs.writeFileSync(INDEX_FILE, JSON.stringify(payload, null, 2));
}

function vapiGet(apiKey, urlPath) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.vapi.ai",
        path: urlPath,
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          let data = null;
          try {
            data = body ? JSON.parse(body) : null;
          } catch {
            data = body;
          }
          resolve({ status: res.statusCode || 500, data });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

function downloadToFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("http://") ? http : https;
    const file = fs.createWriteStream(destPath);
    const req = lib.get(url, { headers: { "User-Agent": "vantora-archive/1.0" } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(destPath, () => {});
        downloadToFile(res.headers.location, destPath).then(resolve, reject);
        return;
      }
      if ((res.statusCode || 500) >= 400) {
        file.close();
        fs.unlink(destPath, () => {});
        reject(new Error(`Download HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve(destPath)));
    });
    req.on("error", (err) => {
      file.close();
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

function recordingCandidates(call) {
  const a = call.artifact || {};
  return [
    call.recordingUrl,
    a.recordingUrl,
    a.stereoRecordingUrl,
    a.recording?.mono?.combinedUrl,
    a.recording?.stereoUrl,
    a.recording?.mono?.assistantUrl,
    a.recording?.mono?.customerUrl,
  ].filter((u) => typeof u === "string" && u.length > 8);
}

function hasRecording(call) {
  return recordingCandidates(call).length > 0;
}

function pickExt(url, contentHint) {
  const lower = `${url} ${contentHint || ""}`.toLowerCase();
  if (lower.includes(".wav") || lower.includes("audio/wav") || lower.includes("audio/x-wav")) return "wav";
  if (lower.includes(".ogg") || lower.includes("audio/ogg")) return "ogg";
  if (lower.includes(".webm") || lower.includes("audio/webm")) return "webm";
  return "mp3";
}

async function fetchAllCalls(apiKey) {
  const maxPages = Math.min(
    10,
    Math.max(1, Number(process.env.ARCHIVE_MAX_PAGES || 10) || 10)
  );
  const all = [];
  let createdAtLt;
  for (let page = 0; page < maxPages; page++) {
    let qs = `limit=100`;
    if (createdAtLt) qs += `&createdAtLt=${encodeURIComponent(createdAtLt)}`;
    const { status, data } = await vapiGet(apiKey, `/call?${qs}`);
    if (status >= 400) throw new Error(`VAPI list failed: ${status} ${JSON.stringify(data)}`);
    const raw = Array.isArray(data) ? data : data?.results || [];
    if (!raw.length) break;
    all.push(...raw);
    createdAtLt = raw[raw.length - 1]?.createdAt;
    if (raw.length < 100) break;
  }
  return all;
}

async function downloadMono(apiKey, id, destPath) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.vapi.ai",
        path: `/call/${id}/mono-recording`,
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          downloadToFile(res.headers.location, destPath).then(resolve, reject);
          return;
        }
        if ((res.statusCode || 500) >= 400) {
          reject(new Error(`mono-recording HTTP ${res.statusCode}`));
          return;
        }
        const type = res.headers["content-type"] || "";
        if (type.includes("json")) {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => reject(new Error(Buffer.concat(chunks).toString("utf8").slice(0, 200))));
          return;
        }
        const file = fs.createWriteStream(destPath);
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve(destPath)));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

function isPermanentDemo(id, row) {
  return (
    String(id || "").startsWith("demo-") ||
    Boolean(row?.demo) ||
    Boolean(row?.permanentDemo) ||
    row?.source === "demo-seed"
  );
}

async function archiveOne(apiKey, call, existingIds) {
  if (!call?.id || !hasRecording(call)) return { skipped: true, reason: "no-recording" };
  if (isPermanentDemo(call.id)) {
    return { skipped: true, reason: "permanent-demo" };
  }
  if (existingIds.has(call.id)) {
    // Refresh metadata but keep audio if already archived
    return { skipped: true, reason: "already-archived" };
  }

  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  let ext = "mp3";
  let dest = path.join(AUDIO_DIR, `${call.id}.${ext}`);
  let ok = false;

  try {
    await downloadMono(apiKey, call.id, dest);
    ok = fs.existsSync(dest) && fs.statSync(dest).size > 500;
  } catch {
    ok = false;
  }

  if (!ok) {
    for (const url of recordingCandidates(call)) {
      ext = pickExt(url);
      dest = path.join(AUDIO_DIR, `${call.id}.${ext}`);
      try {
        await downloadToFile(url, dest);
        if (fs.existsSync(dest) && fs.statSync(dest).size > 500) {
          ok = true;
          break;
        }
      } catch {
        /* try next */
      }
    }
  }

  if (!ok) return { skipped: true, reason: "download-failed" };

  const a = call.artifact || {};
  const row = {
    id: call.id,
    type: call.type,
    status: call.status || "ended",
    endedReason: call.endedReason,
    startedAt: call.startedAt,
    endedAt: call.endedAt,
    createdAt: call.createdAt,
    cost: call.cost,
    customer: call.customer,
    phoneNumberId: call.phoneNumberId,
    assistantId: call.assistantId,
    transcript: a.transcript || call.transcript || "",
    summary: call.analysis?.summary || call.summary || "",
    recordingFile: `audio/${call.id}.${ext}`,
    archivedAt: new Date().toISOString(),
    source: "vapi-sync",
  };

  return { skipped: false, row };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRetryWaits() {
  const raw = process.env.ARCHIVE_RETRY_WAITS || "";
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 5);
}

async function syncOnce(apiKey, byId, existingIds, deletedIds, fast) {
  const live = await fetchAllCalls(apiKey);
  console.log(`VAPI returned ${live.length} call(s).`);

  let added = 0;
  let skipped = 0;
  let pendingRecording = 0;

  for (const call of live) {
    if (deletedIds.has(call.id)) {
      skipped += 1;
      continue;
    }

    // Fast path: ignore already-archived (no meta rewrite / no extra I/O)
    if (fast && existingIds.has(call.id)) {
      skipped += 1;
      continue;
    }

    if (!hasRecording(call) && call.status === "ended") {
      pendingRecording += 1;
    }

    const result = await archiveOne(apiKey, call, existingIds);
    if (result.skipped) {
      skipped += 1;
      if (
        !fast &&
        result.reason === "already-archived" &&
        byId.has(call.id) &&
        !isPermanentDemo(call.id, byId.get(call.id))
      ) {
        const prev = byId.get(call.id);
        byId.set(call.id, {
          ...prev,
          transcript: call.artifact?.transcript || call.transcript || prev.transcript,
          summary: call.analysis?.summary || call.summary || prev.summary,
          endedReason: call.endedReason || prev.endedReason,
          status: call.status || prev.status,
        });
      }
      continue;
    }
    byId.set(result.row.id, result.row);
    existingIds.add(result.row.id);
    added += 1;
    console.log(`Archived ${result.row.id} (${result.row.type || "call"})`);
  }

  return { added, skipped, pendingRecording };
}

async function main() {
  const apiKey = getApiKey();
  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const index = readIndex();
  const byId = new Map(index.calls.map((c) => [c.id, c]));
  const existingIds = new Set(byId.keys());
  const deletedIds = readDeletedIds();
  const fast = process.env.ARCHIVE_FAST === "1";
  const retries = parseRetryWaits();

  console.log(
    `Archive has ${existingIds.size} call(s). Fetching VAPI… fast=${fast ? "yes" : "no"} pages=${process.env.ARCHIVE_MAX_PAGES || 10}`
  );

  let added = 0;
  let skipped = 0;
  let round = await syncOnce(apiKey, byId, existingIds, deletedIds, fast);
  added += round.added;
  skipped += round.skipped;

  // Instead of a fixed 45s sleep: only wait/retry when ended calls still lack audio
  for (const waitSec of retries) {
    if (round.pendingRecording === 0) break;
    console.log(
      `Waiting ${waitSec}s for VAPI recordings to finalize (pending≈${round.pendingRecording})…`
    );
    await sleep(waitSec * 1000);
    round = await syncOnce(apiKey, byId, existingIds, deletedIds, fast);
    added += round.added;
    skipped += round.skipped;
  }

  const calls = [...byId.values()].sort((a, b) => {
    const ta = new Date(a.createdAt || a.startedAt || 0).getTime();
    const tb = new Date(b.createdAt || b.startedAt || 0).getTime();
    return tb - ta;
  });

  // Avoid rewriting index.json on no-op runs (forced slow git add + empty redeploys)
  const sig = (list) =>
    JSON.stringify(
      list.map((c) => ({
        id: c.id,
        summary: c.summary || "",
        transcript: c.transcript || "",
        endedReason: c.endedReason || "",
        status: c.status || "",
        recordingFile: c.recordingFile || "",
      }))
    );
  const indexChanged = added > 0 || sig(index.calls) !== sig(calls);

  if (indexChanged) {
    writeIndex(calls);
    console.log("Index updated.");
  } else {
    console.log("No archive changes — skipped index write.");
  }

  const demoCount = calls.filter((c) => isPermanentDemo(c.id, c)).length;
  console.log(`\nDone. added=${added} skipped=${skipped} totalArchived=${calls.length} permanentDemos=${demoCount}`);
  console.log(`Index: ${INDEX_FILE}`);
  console.log("Demos + archived calls stay forever on GitHub/Vercel (survive VAPI 14-day expiry).");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
