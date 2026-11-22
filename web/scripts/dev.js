/**
 * Dev server: start Next → wait until Ready + homepage fully compiled → THEN open Chrome.
 * Avoids ERR_CONNECTION_REFUSED and "slow blank page" first paint.
 */

const { createServer } = require("net");
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

const webRoot = path.join(__dirname, "..");

function findFreePort(startPort = 3000, maxTries = 40) {
  return new Promise((resolve, reject) => {
    let port = startPort;

    const tryListen = () => {
      if (port > startPort + maxTries) {
        reject(new Error(`No free port found between ${startPort} and ${startPort + maxTries}`));
        return;
      }

      const server = createServer();
      server.unref();
      server.on("error", () => {
        port += 1;
        tryListen();
      });
      server.listen(port, "127.0.0.1", () => {
        server.close(() => resolve(port));
      });
    };

    tryListen();
  });
}

function openInChrome(url) {
  const platform = process.platform;

  if (platform === "win32") {
    const chromePaths = [
      process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
      process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
      process.env["PROGRAMFILES(X86)"] &&
        path.join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
    ].filter(Boolean);

    const chrome = chromePaths.find((p) => fs.existsSync(p));
    if (chrome) {
      spawn(chrome, [url], { detached: true, stdio: "ignore" }).unref();
      return;
    }
    spawn("cmd", ["/c", "start", "", "chrome", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  if (platform === "darwin") {
    spawn("open", ["-a", "Google Chrome", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  spawn("google-chrome", [url], { detached: true, stdio: "ignore" }).on("error", () => {
    spawn("chromium-browser", [url], { detached: true, stdio: "ignore" }).on("error", () => {
      spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
    });
  });
}

function httpGet(url, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        resolve({
          status: res.statusCode || 0,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`timeout ${url}`));
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function looksReady(chunk) {
  const text = String(chunk);
  return (
    /Ready in/i.test(text) ||
    /✓ Ready/i.test(text) ||
    /Local:\s+http/i.test(text) ||
    /started server on/i.test(text) ||
    /Ready on http/i.test(text) ||
    /✓ Starting/i.test(text)
  );
}

async function waitForListening(url, timeoutMs = 180000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await httpGet(url, 5000);
      if (res.status && res.status < 500) return res.status;
    } catch {
      /* keep polling */
    }
    await sleep(350);
  }
  throw new Error(`Timed out waiting for server listen at ${url}`);
}

/**
 * Force first compile of key routes so Chrome does not sit on a blank/loading page.
 */
async function warmRoutes(baseUrl, timeoutMs = 240000) {
  const started = Date.now();
  const routes = ["/", "/calls", "/api/calls", "/api/archive/sync"];
  let homepageOk = false;

  console.log("Warming pages (first compile can take a bit)…");

  while (Date.now() - started < timeoutMs) {
    let allOk = true;
    for (const route of routes) {
      try {
        const res = await httpGet(`${baseUrl}${route}`, 120000);
        const ok = res.status >= 200 && res.status < 500;
        if (!ok) allOk = false;
        if (route === "/" && ok && /vantora|call agent|alex/i.test(res.body)) {
          homepageOk = true;
        }
        if (route === "/" && ok && res.body.length > 400) {
          homepageOk = true;
        }
      } catch {
        allOk = false;
      }
    }

    if (homepageOk && allOk) {
      // Second pass so Turbopack/webpack caches settle
      try {
        await httpGet(`${baseUrl}/`, 60000);
        await httpGet(`${baseUrl}/api/calls`, 60000);
      } catch {
        /* ignore */
      }
      return;
    }

    process.stdout.write(".");
    await sleep(800);
  }

  if (!homepageOk) {
    throw new Error("Homepage did not finish compiling in time");
  }
}

async function main() {
  const port = await findFreePort(3000);
  // Bind IPv4 only — matches findFreePort(127.0.0.1) and avoids ::1 EADDRINUSE races
  const url = `http://127.0.0.1:${port}`;

  console.log(`\nFree port found: ${port}`);
  console.log("Starting Next.js (Turbopack)…");
  console.log("Chrome will open ONLY after homepage + APIs are fully ready.");
  console.log(`Target: ${url}\n`);

  const nextBin = path.join(webRoot, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(
    process.execPath,
    [nextBin, "dev", "--turbopack", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: webRoot,
      stdio: ["inherit", "pipe", "pipe"],
      env: { ...process.env, PORT: String(port) },
    }
  );

  let opened = false;
  let sawReadyLog = false;

  const openOnce = (reason) => {
    if (opened) return;
    opened = true;
    console.log(`\n✅ Fully ready (${reason}). Opening Chrome → ${url}\n`);
    openInChrome(url);
  };

  const forward = (stream, isErr) => {
    stream.on("data", (buf) => {
      if (isErr) process.stderr.write(buf);
      else process.stdout.write(buf);
      if (!sawReadyLog && looksReady(buf)) sawReadyLog = true;
    });
  };

  forward(child.stdout, false);
  forward(child.stderr, true);

  child.on("exit", (code) => {
    if (!opened) console.error("\nNext.js exited before becoming ready.");
    process.exit(code ?? 0);
  });

  try {
    console.log("[1/3] Waiting for Next.js to accept connections…");
    await waitForListening(url, 180000);
    console.log(sawReadyLog ? "    Server listening (Ready log seen)." : "    Server listening.");

    console.log("[2/3] Compiling homepage + call APIs before browser open…");
    await warmRoutes(url, 240000);
    console.log("\n    Homepage + APIs compiled.");

    console.log("[3/3] Settling briefly…");
    await sleep(600);

    openOnce(sawReadyLog ? "Ready + warm compile" : "warm compile");
  } catch (err) {
    console.error(`\n${err.message || err}`);
    console.error("Server is still running — open the URL manually when the console shows Ready.\n");
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
