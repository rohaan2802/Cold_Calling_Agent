/**
 * Push archive deletes / trigger archive workflow so Vercel stays in sync.
 * Needs GITHUB_TOKEN (repo scope) + GITHUB_REPO=owner/name
 */

type GhFile = { sha: string; content: string };

function repoParts(): { owner: string; repo: string } | null {
  const fromVercel =
    process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
      ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
      : "";
  const raw =
    process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY || fromVercel || "";
  if (!raw || !raw.includes("/")) return null;
  const [owner, repo] = raw.split("/");
  return { owner, repo };
}

function token(): string | null {
  return (
    process.env.ARCHIVE_GITHUB_TOKEN ||
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    null
  );
}

async function gh(
  path: string,
  init: RequestInit & { raw?: boolean } = {}
): Promise<Response> {
  const t = token();
  if (!t) throw new Error("GITHUB_TOKEN missing");
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${t}`);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("X-GitHub-Api-Version", "2022-11-28");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`https://api.github.com${path}`, { ...init, headers });
}

async function getFile(
  owner: string,
  repo: string,
  filePath: string
): Promise<GhFile | null> {
  const res = await gh(
    `/repos/${owner}/${repo}/contents/${filePath}?ref=main`
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${filePath}: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    sha: string;
    content?: string;
    encoding?: string;
  };
  const content =
    data.encoding === "base64" && data.content
      ? Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8")
      : "";
  return { sha: data.sha, content };
}

async function putFile(
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  message: string,
  sha?: string
): Promise<void> {
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    branch: "main",
  };
  if (sha) body.sha = sha;
  const res = await gh(`/repos/${owner}/${repo}/contents/${filePath}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PUT ${filePath}: ${res.status} ${text.slice(0, 200)}`);
  }
}

async function deleteFile(
  owner: string,
  repo: string,
  filePath: string,
  sha: string,
  message: string
): Promise<void> {
  const res = await gh(`/repos/${owner}/${repo}/contents/${filePath}`, {
    method: "DELETE",
    body: JSON.stringify({ message, sha, branch: "main" }),
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`DELETE ${filePath}: ${res.status} ${text.slice(0, 200)}`);
  }
}

export function githubSyncConfigured(): boolean {
  return Boolean(token() && repoParts());
}

export type GitHubArchiveRow = {
  id: string;
  type?: string;
  status?: string;
  endedReason?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt?: string;
  cost?: number;
  customer?: { number?: string; name?: string };
  assistantId?: string;
  transcript?: string;
  summary?: string;
  recordingFile: string;
  archivedAt: string;
  source?: string;
  demo?: boolean;
  permanentDemo?: boolean;
  displayName?: string;
};

/**
 * Read call-archive/index.json from GitHub main — available as soon as the
 * archive Action pushes, without waiting for a Vercel redeploy.
 */
export async function fetchArchiveIndexFromGitHub(): Promise<{
  updatedAt: string;
  calls: GitHubArchiveRow[];
} | null> {
  const parts = repoParts();
  const t = token();
  if (!parts || !t) return null;

  try {
    const file = await getFile(
      parts.owner,
      parts.repo,
      "web/public/call-archive/index.json"
    );
    if (!file?.content) return null;
    const parsed = JSON.parse(file.content) as {
      updatedAt?: string;
      calls?: GitHubArchiveRow[];
    };
    return {
      updatedAt: String(parsed.updatedAt || ""),
      calls: Array.isArray(parsed.calls) ? parsed.calls : [],
    };
  } catch {
    return null;
  }
}

/** Stream an archived audio blob from GitHub (private-repo safe). */
export async function fetchArchiveAudioFromGitHub(
  recordingFile: string
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const parts = repoParts();
  const t = token();
  if (!parts || !t) return null;

  const rel = recordingFile.replace(/^\/+/, "").replace(/^call-archive\//, "");
  const filePath = `web/public/call-archive/${rel}`;
  try {
    const res = await gh(
      `/repos/${parts.owner}/${parts.repo}/contents/${filePath}?ref=main`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      content?: string;
      encoding?: string;
      download_url?: string | null;
      size?: number;
    };

    // Prefer download_url (avoids huge base64 in API for large files)
    if (data.download_url) {
      const fileRes = await fetch(data.download_url, {
        headers: { Authorization: `Bearer ${t}`, Accept: "application/octet-stream" },
        cache: "no-store",
      });
      if (!fileRes.ok) return null;
      const buf = await fileRes.arrayBuffer();
      if (buf.byteLength < 200) return null;
      const lower = filePath.toLowerCase();
      const contentType = lower.endsWith(".wav")
        ? "audio/wav"
        : lower.endsWith(".ogg")
          ? "audio/ogg"
          : lower.endsWith(".webm")
            ? "audio/webm"
            : "audio/mpeg";
      return { body: buf, contentType };
    }

    if (data.encoding === "base64" && data.content) {
      const buf = Buffer.from(data.content.replace(/\n/g, ""), "base64");
      if (buf.length < 200) return null;
      const lower = filePath.toLowerCase();
      const contentType = lower.endsWith(".wav")
        ? "audio/wav"
        : lower.endsWith(".ogg")
          ? "audio/ogg"
          : lower.endsWith(".webm")
            ? "audio/webm"
            : "audio/mpeg";
      return { body: buf, contentType };
    }
    return null;
  } catch {
    return null;
  }
}

/** Fire-and-forget: ask Actions to pull new VAPI recordings into call-archive and push. */
export async function triggerArchiveWorkflow(reason = "end-of-call"): Promise<{
  ok: boolean;
  detail: string;
}> {
  const parts = repoParts();
  const t = token();
  if (!parts || !t) {
    return { ok: false, detail: "GITHUB_TOKEN / GITHUB_REPO not set" };
  }

  const res = await gh(`/repos/${parts.owner}/${parts.repo}/dispatches`, {
    method: "POST",
    body: JSON.stringify({
      event_type: "archive-recordings",
      client_payload: { reason, at: new Date().toISOString() },
    }),
  });

  if (res.status === 204 || res.ok) {
    return { ok: true, detail: "repository_dispatch sent" };
  }
  const text = await res.text();
  return { ok: false, detail: `${res.status} ${text.slice(0, 200)}` };
}

/**
 * Permanently hide a call on GitHub (so Vercel redeploy no longer lists it).
 * Updates deleted.json + index.json; removes audio blobs when present.
 */
export async function pushCallDeleteToGitHub(callId: string): Promise<{
  ok: boolean;
  detail: string;
}> {
  const parts = repoParts();
  const t = token();
  if (!parts || !t) {
    return { ok: false, detail: "GITHUB_TOKEN / GITHUB_REPO not set — local/cookie hide only" };
  }

  const { owner, repo } = parts;
  const msg = `chore: permanently delete call ${callId} from archive`;

  try {
    // deleted.json
    const deletedPath = "web/public/call-archive/deleted.json";
    const deletedFile = await getFile(owner, repo, deletedPath);
    let ids: string[] = [];
    if (deletedFile) {
      try {
        const parsed = JSON.parse(deletedFile.content);
        ids = Array.isArray(parsed?.ids) ? parsed.ids.map(String) : [];
      } catch {
        ids = [];
      }
    }
    if (!ids.includes(callId)) ids.push(callId);
    await putFile(
      owner,
      repo,
      deletedPath,
      JSON.stringify({ updatedAt: new Date().toISOString(), ids: ids.slice(-500) }, null, 2) +
        "\n",
      msg,
      deletedFile?.sha
    );

    // index.json — drop the call
    const indexPath = "web/public/call-archive/index.json";
    const indexFile = await getFile(owner, repo, indexPath);
    if (indexFile) {
      try {
        const parsed = JSON.parse(indexFile.content);
        const calls = Array.isArray(parsed?.calls)
          ? parsed.calls.filter((c: { id?: string }) => c?.id !== callId)
          : [];
        await putFile(
          owner,
          repo,
          indexPath,
          JSON.stringify({ updatedAt: new Date().toISOString(), calls }, null, 2) + "\n",
          msg,
          indexFile.sha
        );
      } catch {
        /* ignore parse */
      }
    }

    // audio files
    for (const ext of ["mp3", "wav", "ogg", "webm"]) {
      const audioPath = `web/public/call-archive/audio/${callId}.${ext}`;
      const audio = await getFile(owner, repo, audioPath);
      if (audio?.sha) {
        await deleteFile(owner, repo, audioPath, audio.sha, msg);
      }
    }

    return { ok: true, detail: "GitHub archive updated (Vercel will redeploy)" };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
