/**
 * Seed 15+ permanent dual-voice demo recordings (0 VAPI credits).
 * Alex = male voice, Prospect = female voice (Windows SAPI).
 *
 * These stay in web/public/call-archive forever unless YOU delete them in the UI.
 * VAPI sync never removes or overwrites them.
 *
 *   node scripts/seed-demo-calls.js          # add missing only
 *   node scripts/seed-demo-calls.js --force  # rebuild all demo audio
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const ARCHIVE = path.join(ROOT, "web", "public", "call-archive");
const AUDIO = path.join(ARCHIVE, "audio");
const INDEX = path.join(ARCHIVE, "index.json");
const DELETED = path.join(ARCHIVE, "deleted.json");
const FORCE = process.argv.includes("--force");

/** @type {Array<{id:string,type:string,summary:string,customer:object,lines:string[][]}>} */
const DEMOS = [
  {
    id: "demo-web-001",
    type: "webCall",
    summary: "Interested - asked for email follow-up",
    customer: { name: "Web · Interested" },
    lines: [
      ["Alex", "Hi, this is Alex from Vantora. We help teams automate repetitive follow ups. Do you have thirty seconds?"],
      ["Prospect", "Sure, go ahead."],
      ["Alex", "How do you track reminders today?"],
      ["Prospect", "Mostly spreadsheets. It gets messy."],
      ["Alex", "That is exactly where we help. I can email a short overview. Best address?"],
      ["Prospect", "Send it to ops at example dot com."],
      ["Alex", "Perfect. Sending that today. Thanks for your time."],
    ],
  },
  {
    id: "demo-web-002",
    type: "webCall",
    summary: "Callback requested - Tuesday morning",
    customer: { name: "Web · Callback" },
    lines: [
      ["Alex", "Hi, Alex from Vantora. Quick question about automating your outbound follow ups."],
      ["Prospect", "I am walking into a meeting."],
      ["Alex", "No problem. Would Tuesday morning work for a callback?"],
      ["Prospect", "Tuesday at ten works."],
      ["Alex", "Great. I will call Tuesday at ten. Thank you."],
    ],
  },
  {
    id: "demo-web-003",
    type: "webCall",
    summary: "Not interested - already have a vendor",
    customer: { name: "Web · Not interested" },
    lines: [
      ["Alex", "Hi, this is Alex calling from Vantora. We automate repetitive workflows. Thirty seconds?"],
      ["Prospect", "We already have a vendor for that. Not interested."],
      ["Alex", "Understood. Thanks for being direct. Have a good day."],
    ],
  },
  {
    id: "demo-web-004",
    type: "webCall",
    summary: "Objection handled - price then booked demo",
    customer: { name: "Web · Price objection" },
    lines: [
      ["Alex", "Hi, Alex from Vantora. We cut hours of manual follow up every week. Got a moment?"],
      ["Prospect", "Everything like this is expensive."],
      ["Alex", "Fair. Most teams start small and only expand if it saves time. Want a ten minute walkthrough?"],
      ["Prospect", "Okay, send a calendar link."],
      ["Alex", "Will do. Thanks — talk soon."],
    ],
  },
  {
    id: "demo-web-005",
    type: "webCall",
    summary: "Do not call - asked to be removed",
    customer: { name: "Web · Do not call" },
    lines: [
      ["Alex", "Hi, this is Alex from Vantora. Am I catching you at a bad time?"],
      ["Prospect", "Please do not call this number again."],
      ["Alex", "Absolutely. I will remove you from the list. Sorry for the interruption. Goodbye."],
    ],
  },
  {
    id: "demo-outbound-001",
    type: "outboundPhoneCall",
    summary: "Callback requested for Thursday",
    customer: { number: "+15551234567", name: "Outbound · Callback" },
    lines: [
      ["Alex", "Hi, this is Alex from Vantora. Am I speaking with the operations lead?"],
      ["Prospect", "Yes, but I am in a meeting."],
      ["Alex", "No problem. Would Thursday afternoon work for a quick callback?"],
      ["Prospect", "Thursday at three works."],
      ["Alex", "Great. I will call Thursday at three. Thank you."],
    ],
  },
  {
    id: "demo-outbound-002",
    type: "outboundPhoneCall",
    summary: "Interested - wants proposal PDF",
    customer: { number: "+15551230002", name: "Outbound · Proposal" },
    lines: [
      ["Alex", "Hi, Alex with Vantora. We help sales teams keep follow ups consistent. Open to a quick pitch?"],
      ["Prospect", "Send a one page proposal and I will look."],
      ["Alex", "Happy to. What email should I use?"],
      ["Prospect", "Use sales at northwind example dot com."],
      ["Alex", "Got it. Proposal goes out today. Thanks."],
    ],
  },
  {
    id: "demo-outbound-003",
    type: "outboundPhoneCall",
    summary: "Wrong person - transferred hint",
    customer: { number: "+15551230003", name: "Outbound · Wrong person" },
    lines: [
      ["Alex", "Hi, Alex from Vantora. Looking for whoever owns outbound process."],
      ["Prospect", "That is not me. Try operations."],
      ["Alex", "Appreciate it. Who on operations should I ask for?"],
      ["Prospect", "Ask for Jordan in ops."],
      ["Alex", "Thank you, Jordan in ops. Have a good one."],
    ],
  },
  {
    id: "demo-outbound-004",
    type: "outboundPhoneCall",
    summary: "Gatekeeper - left brief message",
    customer: { number: "+15551230004", name: "Outbound · Gatekeeper" },
    lines: [
      ["Alex", "Hi, Alex calling from Vantora for your operations manager."],
      ["Prospect", "They are not available. I can take a message."],
      ["Alex", "Please let them know Alex from Vantora called about cutting manual follow up time. I will try again tomorrow."],
      ["Prospect", "Okay, I will pass that along."],
      ["Alex", "Thank you."],
    ],
  },
  {
    id: "demo-outbound-005",
    type: "outboundPhoneCall",
    summary: "Voicemail - short leave-behind",
    customer: { number: "+15551230005", name: "Outbound · Voicemail" },
    lines: [
      ["Alex", "Hi, this is Alex from Vantora. Sorry I missed you."],
      ["Prospect", "Please leave a message after the tone."],
      ["Alex", "We help teams automate repetitive follow ups. I will try you again soon. Thanks."],
    ],
  },
  {
    id: "demo-inbound-001",
    type: "inboundPhoneCall",
    summary: "Not interested - reception desk",
    customer: { number: "+15559876543", name: "Inbound · Reception" },
    lines: [
      ["Alex", "Hi there. This is Alex calling from Vantora. We help businesses automate repetitive workflows. Do you have thirty seconds?"],
      ["Prospect", "I just work reception. I do not handle that. Thank you. Bye."],
      ["Alex", "Understood. Thank you for letting me know. Goodbye."],
    ],
  },
  {
    id: "demo-inbound-002",
    type: "inboundPhoneCall",
    summary: "Interested inbound - booked next step",
    customer: { number: "+15559870002", name: "Inbound · Interested" },
    lines: [
      ["Alex", "Thanks for calling Vantora, this is Alex. How can I help?"],
      ["Prospect", "I saw your site. Can you automate our reminder calls?"],
      ["Alex", "Yes. We can start with a short pilot. Want me to schedule a walkthrough?"],
      ["Prospect", "Yes, tomorrow afternoon."],
      ["Alex", "Locked for tomorrow afternoon. Talk then."],
    ],
  },
  {
    id: "demo-inbound-003",
    type: "inboundPhoneCall",
    summary: "Support-style inbound - redirected to sales",
    customer: { number: "+15559870003", name: "Inbound · Redirect" },
    lines: [
      ["Alex", "Vantora, Alex speaking."],
      ["Prospect", "I think I reached the wrong team. I need billing."],
      ["Alex", "No worries. Billing is a separate line. I can note your number for sales if you also want a product chat."],
      ["Prospect", "Just billing is fine."],
      ["Alex", "Understood. Sorry for the mix up. Goodbye."],
    ],
  },
  {
    id: "demo-inbound-004",
    type: "inboundPhoneCall",
    summary: "Urdu-friendly English demo - soft interest",
    customer: { number: "+15559870004", name: "Inbound · Soft interest" },
    lines: [
      ["Alex", "Hi, Alex from Vantora. Thanks for calling in."],
      ["Prospect", "Someone told me you automate cold follow ups."],
      ["Alex", "That is right. Are you exploring this for your team this quarter?"],
      ["Prospect", "Maybe. Email me details first."],
      ["Alex", "Gladly. I will send a short overview today."],
    ],
  },
  {
    id: "demo-inbound-005",
    type: "inboundPhoneCall",
    summary: "Hangup mid-pitch - short call",
    customer: { number: "+15559870005", name: "Inbound · Early hangup" },
    lines: [
      ["Alex", "Hi, this is Alex from Vantora. We help automate repetitive outbound work."],
      ["Prospect", "Not now. Bye."],
      ["Alex", "No problem. Goodbye."],
    ],
  },
  {
    id: "demo-web-006",
    type: "webCall",
    summary: "Qualified lead - decision maker confirmed",
    customer: { name: "Web · Decision maker" },
    lines: [
      ["Alex", "Hi, Alex from Vantora. Do you own the process for outbound follow ups?"],
      ["Prospect", "Yes, that is my team."],
      ["Alex", "Perfect. What breaks most often today — reminders, handoffs, or reporting?"],
      ["Prospect", "Handoffs. Things fall through."],
      ["Alex", "We can tighten that. I will send a short plan after this call."],
    ],
  },
];

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function deletedSet() {
  const raw = readJson(DELETED, { ids: [] });
  const ids = Array.isArray(raw.ids) ? raw.ids : [];
  return new Set(ids.map(String));
}

function listVoices() {
  const ps1 = [
    "Add-Type -AssemblyName System.Speech",
    "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer",
    "$s.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name + '|' + $_.VoiceInfo.Gender }",
    "$s.Dispose()",
  ].join("; ");
  const r = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps1],
    { encoding: "utf8" }
  );
  return String(r.stdout || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [name, gender] = l.split("|");
      return { name, gender: (gender || "").toLowerCase() };
    });
}

function pickVoices(voices) {
  const male =
    voices.find((v) => /david|mark|george|james|guy/i.test(v.name)) ||
    voices.find((v) => v.gender === "male") ||
    voices[0];
  const female =
    voices.find(
      (v) =>
        v.name !== male?.name &&
        (/zira|hazel|susan|helen|aria|jenny|sara/i.test(v.name) || v.gender === "female")
    ) ||
    voices.find((v) => v.name !== male?.name) ||
    male;
  return { alex: male?.name || "", prospect: female?.name || "" };
}

function speakDialogToWav(lines, outWav, voiceMap) {
  const escaped = outWav.replace(/'/g, "''");
  const alexVoice = (voiceMap.alex || "").replace(/'/g, "''");
  const prospectVoice = (voiceMap.prospect || "").replace(/'/g, "''");
  const speakLines = lines
    .map(([who, text]) => {
      const voice = who === "Alex" ? alexVoice : prospectVoice;
      const safe = String(text).replace(/'/g, "''");
      return [
        voice ? `try { $s.SelectVoice('${voice}') } catch {}` : "",
        `$s.Speak('${safe}')`,
        "Start-Sleep -Milliseconds 220",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const ps1 = [
    "Add-Type -AssemblyName System.Speech",
    "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer",
    "$s.Rate = 0",
    "$s.Volume = 100",
    `$s.SetOutputToWaveFile('${escaped}')`,
    speakLines,
    "$s.Dispose()",
  ].join("\n");

  const tmp = path.join(AUDIO, `_speak_${Date.now()}_${Math.random().toString(16).slice(2)}.ps1`);
  fs.writeFileSync(tmp, ps1, "utf8");
  const r = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tmp],
    { encoding: "utf8" }
  );
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* ignore */
  }
  if (r.status !== 0 || !fs.existsSync(outWav) || fs.statSync(outWav).size < 1000) {
    throw new Error(String(r.stderr || r.stdout || "SAPI TTS failed").slice(0, 400));
  }
}

function transcriptOf(lines) {
  return lines.map((pair) => pair[0] + ": " + pair[1]).join("\n") + "\n";
}

function main() {
  fs.mkdirSync(AUDIO, { recursive: true });
  const voices = listVoices();
  const voiceMap = pickVoices(voices);
  console.log(`Voices → Alex: ${voiceMap.alex || "(default)"} | Prospect: ${voiceMap.prospect || "(default)"}`);
  console.log(`Seeding ${DEMOS.length} permanent demo recordings…`);

  const deleted = deletedSet();
  const index = readJson(INDEX, { updatedAt: new Date(0).toISOString(), calls: [] });
  const byId = new Map((index.calls || []).map((c) => [c.id, c]));
  let added = 0;
  let skipped = 0;

  DEMOS.forEach((demo, i) => {
    if (deleted.has(demo.id)) {
      console.log("skip user-deleted " + demo.id);
      skipped++;
      return;
    }
    const wav = path.join(AUDIO, demo.id + ".wav");
    const exists = fs.existsSync(wav) && byId.has(demo.id);
    if (exists && !FORCE) {
      // Still refresh metadata so labels/summaries stay current
      const prev = byId.get(demo.id) || {};
      byId.set(demo.id, {
        ...prev,
        id: demo.id,
        type: demo.type,
        summary: demo.summary,
        customer: demo.customer,
        transcript: transcriptOf(demo.lines),
        recordingFile: "audio/" + demo.id + ".wav",
        source: "demo-seed",
        demo: true,
        permanentDemo: true,
      });
      console.log("keep existing audio " + demo.id);
      skipped++;
      return;
    }
    if (exists && FORCE) {
      try {
        fs.unlinkSync(wav);
      } catch {
        /* ignore */
      }
    }
    console.log(`[${i + 1}/${DEMOS.length}] dual-voice ${demo.id}…`);
    speakDialogToWav(demo.lines, wav, voiceMap);
    const started = new Date(Date.now() - (i + 1) * 45 * 60 * 1000);
    const ended = new Date(started.getTime() + 40000 + demo.lines.length * 2500);
    byId.set(demo.id, {
      id: demo.id,
      type: demo.type,
      status: "ended",
      endedReason: "customer-ended-call",
      startedAt: started.toISOString(),
      endedAt: ended.toISOString(),
      createdAt: started.toISOString(),
      cost: 0,
      customer: demo.customer,
      transcript: transcriptOf(demo.lines),
      summary: demo.summary,
      recordingFile: "audio/" + demo.id + ".wav",
      archivedAt: new Date().toISOString(),
      source: "demo-seed",
      demo: true,
      permanentDemo: true,
      voiceNote: `Alex=${voiceMap.alex || "default"}; Prospect=${voiceMap.prospect || "default"}`,
    });
    added++;
  });

  // Preserve any non-demo archived calls (real VAPI sync rows)
  const calls = Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
  fs.writeFileSync(INDEX, JSON.stringify({ updatedAt: new Date().toISOString(), calls }, null, 2));
  if (!fs.existsSync(DELETED)) {
    fs.writeFileSync(
      DELETED,
      JSON.stringify({ updatedAt: new Date().toISOString(), ids: [] }, null, 2)
    );
  }

  const demoCount = calls.filter((c) => c.demo || String(c.id).startsWith("demo-")).length;
  console.log(`\nDone. generated=${added} kept=${skipped} totalArchive=${calls.length} demos=${demoCount}`);
  console.log("Demos never expire and survive VAPI deletion. Only UI Delete removes them.");
}

main();
