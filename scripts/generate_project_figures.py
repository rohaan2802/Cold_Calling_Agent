#!/usr/bin/env python3
"""Generate 24 Vantora-themed project figures (Pillow only)."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Callable, List, Optional, Tuple

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SCREENSHOTS = ROOT / "assets" / "screenshots"
THUMBS = ROOT / "assets" / "thumbs"

W_FULL, H_FULL = 1440, 900
W_THUMB, H_THUMB = 960, 600

# High-contrast recruiter palette (readable on Pages + README)
BG = "#0b1220"
ACCENT = "#2dd4bf"
WHITE = "#f8fafc"
MUTED = "#cbd5e1"
PANEL = "#1e293b"
PANEL_ALT = "#162032"
BORDER = "#38bdf8"
CODE_BG = "#f1f5f9"
CODE_FG = "#0f172a"
CODE_MUTED = "#475569"
CODE_HL = "#0f766e"
ACCENT_DIM = "#0d9488"
WARN = "#fbbf24"

MARGIN = 36
TITLE_H = 78
INNER_PAD = 22


def hex_rgb(h: str) -> Tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore


def load_font(size: int, mono: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        ["Consolas.ttf", "CascadiaMono.ttf", "lucon.ttf"]
        if mono
        else ["Segoe UI.ttf", "segoeui.ttf", "Arial.ttf", "calibri.ttf"]
    )
    windir = os.environ.get("WINDIR", r"C:\Windows")
    for name in candidates:
        path = Path(windir) / "Fonts" / name
        if path.exists():
            try:
                return ImageFont.truetype(str(path), size)
            except OSError:
                pass
    return ImageFont.load_default()


def read_text(rel: str, max_lines: Optional[int] = None) -> str:
    p = ROOT / rel.replace("/", os.sep)
    if not p.exists():
        return f"(missing: {rel})"
    text = p.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    if max_lines:
        lines = lines[:max_lines]
    return "\n".join(lines)


def repo_tree_lines() -> List[str]:
    folders = ["web", "scripts", "docs", "prompts", ".github", "config", "assets"]
    lines = ["Cold-Calling-Agent/"]
    for folder in folders:
        fp = ROOT / folder
        if not fp.is_dir():
            continue
        lines.append(f"├── {folder}/")
        try:
            children = sorted(fp.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))[:8]
        except OSError:
            continue
        for i, ch in enumerate(children):
            branch = "│   " if i < len(children) - 1 else "    "
            prefix = "├── " if i < len(children) - 1 else "└── "
            if ch.is_dir():
                lines.append(f"│   {prefix}{ch.name}/")
                if folder == "web" and ch.name == "app":
                    for sub in ["page.tsx", "calls/", "api/"]:
                        lines.append(f"│   │   └── {sub}")
            else:
                lines.append(f"│   {prefix}{ch.name}")
        if len(list(fp.iterdir())) > 8:
            lines.append(f"│   └── … ({len(list(fp.iterdir()))} items total)")
    return lines


class Canvas:
    def __init__(self, title: str, caption_line: str = "Vantora · Cold_Calling_Agent · Recruiter showcase"):
        self.title = title
        self.img = Image.new("RGB", (W_FULL, H_FULL), hex_rgb(BG))
        self.draw = ImageDraw.Draw(self.img)
        self.font_title = load_font(30)
        self.font_sub = load_font(16)
        self.font_body = load_font(20)
        self.font_small = load_font(16)
        self.font_mono = load_font(17, mono=True)
        self.font_mono_sm = load_font(16, mono=True)
        self.y = MARGIN + TITLE_H
        self._backdrop()
        self._title_bar()
        self.draw.text((MARGIN, 8), caption_line, fill=hex_rgb(MUTED), font=self.font_sub)

    def _backdrop(self):
        """Subtle interactive grid + glow so panels read clearly."""
        for i in range(0, W_FULL, 48):
            self.draw.line((i, 0, i, H_FULL), fill=hex_rgb("#132033"), width=1)
        for j in range(0, H_FULL, 48):
            self.draw.line((0, j, W_FULL, j), fill=hex_rgb("#132033"), width=1)
        # Soft corner glow bands
        for k in range(0, 120, 4):
            a = 18 - k // 8
            if a <= 0:
                break
            col = (11 + a, 30 + a, 55 + a)
            self.draw.rectangle((0, 0, W_FULL, 4 + k), fill=col)

    def _title_bar(self):
        self.draw.rectangle((0, 0, W_FULL, TITLE_H + 16), fill=hex_rgb("#0f1a2e"))
        self.draw.rectangle((0, TITLE_H + 14, W_FULL, TITLE_H + 20), fill=hex_rgb(ACCENT))
        self.draw.rectangle((0, TITLE_H + 20, 12, H_FULL), fill=hex_rgb(ACCENT))
        tw = self.draw.textlength(self.title, font=self.font_title)
        self.draw.text(((W_FULL - tw) / 2, 28), self.title, fill=hex_rgb(WHITE), font=self.font_title)

    def panel(self, x1: int, y1: int, x2: int, y2: int, fill: str = PANEL):
        # Outer glow edge for visibility
        self.draw.rounded_rectangle((x1 - 2, y1 - 2, x2 + 2, y2 + 2), radius=14, outline=hex_rgb("#67e8f9"), width=2)
        self.draw.rounded_rectangle((x1, y1, x2, y2), radius=12, fill=hex_rgb(fill), outline=hex_rgb(BORDER), width=3)

    def wrap_text(self, text: str, font, max_w: int) -> List[str]:
        words = text.replace("\t", "    ").split()
        lines: List[str] = []
        cur = ""
        for w in words:
            test = f"{cur} {w}".strip()
            if self.draw.textlength(test, font=font) <= max_w:
                cur = test
            else:
                if cur:
                    lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        return lines if lines else [""]

    def draw_paragraph(self, text: str, x: int, y: int, max_w: int, color=WHITE, font=None, line_gap=6) -> int:
        font = font or self.font_body
        out_y = y
        for para in text.split("\n"):
            for line in self.wrap_text(para, font, max_w):
                self.draw.text((x, out_y), line, fill=hex_rgb(color), font=font)
                out_y += font.size + line_gap
            out_y += 4
        return out_y

    def draw_code(self, lines: List[str], x: int, y: int, w: int, h: int, highlight: Optional[List[int]] = None):
        # Light IDE panel — max contrast for recruiter screenshots
        self.draw.rounded_rectangle((x - 2, y - 2, x + w + 2, y + h + 2), radius=14, outline=hex_rgb("#67e8f9"), width=2)
        self.draw.rounded_rectangle((x, y, x + w, y + h), radius=12, fill=hex_rgb(CODE_BG), outline=hex_rgb("#0ea5e9"), width=3)
        # Window chrome
        self.draw.ellipse((x + 14, y + 12, x + 26, y + 24), fill=hex_rgb("#f87171"))
        self.draw.ellipse((x + 34, y + 12, x + 46, y + 24), fill=hex_rgb("#fbbf24"))
        self.draw.ellipse((x + 54, y + 12, x + 66, y + 24), fill=hex_rgb("#34d399"))
        pad = 18
        top = 36
        lh = 24
        max_lines = max(1, (h - pad - top) // lh)
        for i, line in enumerate(lines[:max_lines]):
            ly = y + top + i * lh
            if highlight and i in highlight:
                self.draw.rectangle((x + 8, ly - 2, x + w - 8, ly + lh - 2), fill=hex_rgb("#ccfbf1"))
                fg = CODE_HL
            else:
                fg = CODE_FG
            if line.strip().startswith("//") or line.strip().startswith("#") or line.strip().startswith("*"):
                fg = CODE_MUTED
            display = line.replace("\t", "    ")
            if len(display) > 88:
                display = display[:85] + "..."
            self.draw.text((x + pad, ly), display, fill=hex_rgb(fg), font=self.font_mono_sm)

    def draw_flow_box(self, cx: int, cy: int, label: str, sub: str = "", w: int = 160, h: int = 56):
        x1, y1 = cx - w // 2, cy - h // 2
        x2, y2 = cx + w // 2, cy + h // 2
        self.panel(x1, y1, x2, y2)
        self.draw.text((cx - self.draw.textlength(label, font=self.font_small) / 2, cy - 18), label, fill=hex_rgb(WHITE), font=self.font_small)
        if sub:
            self.draw.text((cx - self.draw.textlength(sub, font=self.font_small) / 2, cy + 4), sub, fill=hex_rgb(ACCENT), font=self.font_small)

    def arrow_h(self, x1: int, y: int, x2: int):
        self.draw.line((x1, y, x2, y), fill=hex_rgb(ACCENT), width=3)
        self.draw.polygon([(x2, y), (x2 - 10, y - 6), (x2 - 10, y + 6)], fill=hex_rgb(ACCENT))

    def arrow_v(self, x: int, y1: int, y2: int):
        self.draw.line((x, y1, x, y2), fill=hex_rgb(ACCENT), width=3)
        self.draw.polygon([(x, y2), (x - 6, y2 - 10), (x + 6, y2 - 10)], fill=hex_rgb(ACCENT))


FIGURES_META: List[dict] = []


def register(fig_id: int, filename: str, title: str, caption: str, category: str, drawer: Callable[[Canvas], None]):
    FIGURES_META.append(
        {"id": fig_id, "file": filename, "title": title, "caption": caption, "category": category, "_draw": drawer}
    )


def fig01(c: Canvas):
    c.panel(MARGIN, 100, W_FULL - MARGIN, H_FULL - MARGIN)
    lines = repo_tree_lines()
    c.draw.text((MARGIN + INNER_PAD, 120), "Repository layout (top-level)", fill=hex_rgb(ACCENT), font=c.font_sub)
    c.draw_code(lines, MARGIN + INNER_PAD, 150, W_FULL - 2 * MARGIN - 2 * INNER_PAD, H_FULL - MARGIN - 170)


def fig02(c: Canvas):
    c.draw_paragraph(
        "Real-time voice stack orchestrated by VAPI — browser mic or PSTN in, Groq LLM + Elliot TTS out.",
        MARGIN,
        100,
        W_FULL - 2 * MARGIN,
        color=MUTED,
    )
    boxes = [
        (200, 280, "Browser / Phone", "WebRTC · PSTN"),
        (440, 280, "VAPI", "orchestration"),
        (680, 280, "Deepgram STT", "nova-3"),
        (920, 280, "Groq LLM", "llama-3.3-70b"),
        (1160, 280, "Elliot TTS", "VAPI V2"),
    ]
    for i, (cx, cy, label, sub) in enumerate(boxes):
        c.draw_flow_box(cx, cy, label, sub, w=200)
        if i < len(boxes) - 1:
            c.arrow_h(cx + 105, cy, boxes[i + 1][0] - 105)
    c.panel(MARGIN, 380, W_FULL - MARGIN, 520, PANEL_ALT)
    c.draw_paragraph(
        "Next.js UI (TalkToAgent, Outbound) · assistantOverrides per language\n"
        "Call History hybrid: live VAPI + GitHub archive (A/V badges)",
        MARGIN + INNER_PAD,
        400,
        W_FULL - 2 * MARGIN - 40,
    )


def fig03(c: Canvas):
    px, py = MARGIN + 40, 110
    pw, ph = 680, H_FULL - 160
    c.panel(px, py, px + pw, py + ph)
    c.draw.text((px + 24, py + 20), "Browser voice · no phone needed", fill=hex_rgb(ACCENT), font=c.font_sub)
    c.draw.text((px + 24, py + 48), "Call Agent", fill=hex_rgb(WHITE), font=load_font(32))
    c.draw_paragraph(
        "Choose English or Urdu, then start. Language stays locked for the whole call.",
        px + 24,
        py + 95,
        pw - 48,
        color=MUTED,
        font=c.font_small,
    )
    c.draw.rounded_rectangle((px + 24, py + 150, px + 220, py + 195), radius=8, fill=hex_rgb(ACCENT_DIM), outline=hex_rgb(ACCENT), width=2)
    c.draw.text((px + 48, py + 162), "English ✓", fill=hex_rgb(WHITE), font=c.font_body)
    c.draw.rounded_rectangle((px + 240, py + 150, px + 400, py + 195), radius=8, outline=hex_rgb(BORDER), width=2)
    c.draw.text((px + 270, py + 162), "Urdu", fill=hex_rgb(MUTED), font=c.font_body)
    c.draw.rounded_rectangle((px + 24, py + 220, px + pw - 24, py + 280), radius=10, fill=hex_rgb(ACCENT))
    c.draw.text((px + 180, py + 238), "Call Agent (English)", fill=hex_rgb(BG), font=load_font(22))
    c.draw.text((px + 24, py + 310), "Ready · English selected", fill=hex_rgb(ACCENT), font=c.font_small)
    c.draw.text((px + 24, py + 340), "Listening…", fill=hex_rgb(WHITE), font=c.font_body)
    rx = px + pw + 60
    c.panel(rx, py, W_FULL - MARGIN, py + ph)
    c.draw.text((rx + 20, py + 20), "CALL_AGENT_NOTES (repo)", fill=hex_rgb(ACCENT), font=c.font_sub)
    notes = [
        ("Best for demos", "Browser mic — fewer credits than outbound."),
        ("Language lock", "Pick EN or UR before start — locked whole call."),
        ("Hangup", 'Say "bye bye" / call cut — clean end.'),
        ("After the call", "Recording → VAPI → archive → Call History."),
    ]
    ny = py + 55
    for t, b in notes:
        c.draw.text((rx + 20, ny), t, fill=hex_rgb(WHITE), font=c.font_small)
        ny = c.draw_paragraph(b, rx + 20, ny + 22, W_FULL - rx - 50, color=MUTED, font=c.font_small) + 12


def fig04(c: Canvas):
    c.panel(MARGIN, 100, W_FULL - MARGIN, 420)
    c.draw.text((MARGIN + INNER_PAD, 120), "Urdu mode — Roman Urdu TTS lock (Elliot)", fill=hex_rgb(ACCENT), font=c.font_sub)
    c.draw_paragraph(
        "Pehle English ya Urdu choose karein… Language poori call ke liye lock rehti hai.\n"
        'Lock line: "Mazrat, main sirf Urdu hi bolta aur samajhta hoon."\n'
        "Jawab SIRF khalis Roman Urdu — Arabic script → TTS freeze.",
        MARGIN + INNER_PAD,
        155,
        W_FULL - 2 * MARGIN - 40,
        font=c.font_body,
    )
    c.draw.rounded_rectangle((MARGIN + INNER_PAD, 320, MARGIN + 320, 380), radius=8, fill=hex_rgb(ACCENT_DIM), outline=hex_rgb(ACCENT), width=2)
    c.draw.text((MARGIN + 70, 338), "Urdu ✓ locked", fill=hex_rgb(WHITE), font=c.font_body)
    excerpt = read_text("web/lib/urduSystemPrompt.ts", 18).splitlines()[6:16]
    c.draw_code(excerpt, MARGIN, 440, W_FULL - 2 * MARGIN, H_FULL - MARGIN - 20)


def fig05(c: Canvas):
    steps = [
        "User enters +1 number",
        "POST /api/outbound",
        "validateOutboundPhone → E.164",
        "Check VAPI_ASSISTANT_ID + PHONE_NUMBER_ID",
        "speechCaptureOverrides(en)",
        "vapiFetch POST /call",
        "Phone rings → Alex speaks",
        "Recording → webhook → archive",
    ]
    y = 120
    for i, s in enumerate(steps):
        cy = y + i * 78
        c.draw_flow_box(720, cy, f"Step {i+1}", s, w=520, h=52)
        if i > 0:
            c.arrow_v(720, y + (i - 1) * 78 + 30, cy - 30)
    c.panel(MARGIN, 100, MARGIN + 380, H_FULL - MARGIN)
    left_x = MARGIN + INNER_PAD
    c.draw.text((left_x, 120), "Outbound dialer", fill=hex_rgb(ACCENT), font=c.font_sub)
    c.draw_paragraph(
        "US +1 only on free VAPI number\n"
        "~10 outbound attempts / day cap\n"
        "English assistant overrides\n"
        "Groq + Elliot same as web EN",
        left_x,
        155,
        300,
    )
    snippet = read_text("web/app/api/outbound/route.ts", 45).splitlines()[15:38]
    c.draw_code(snippet, left_x, 320, 360, 480)


def fig06(c: Canvas):
    c.draw.text((MARGIN, 105), "Call History — hybrid list (live + archive)", fill=hex_rgb(MUTED), font=c.font_sub)
    rows = [
        ("Web call · callback booked", "(V)", "Live VAPI — archive pending", "2:14"),
        ("Urdu demo · Allah hafiz", "(A)", "Permanent GitHub archive", "4:02"),
        ("Outbound · US prospect", "(V)", "Recording on VAPI", "1:48"),
        ("Sample inbound demo", "(A)", "Seeded + archived audio", "3:21"),
    ]
    y = 140
    for label, badge, sub, dur in rows:
        c.panel(MARGIN, y, W_FULL - MARGIN, y + 88)
        c.draw.text((MARGIN + 24, y + 18), label, fill=hex_rgb(WHITE), font=c.font_body)
        c.draw.text((MARGIN + 24, y + 48), sub, fill=hex_rgb(MUTED), font=c.font_small)
        bx = W_FULL - MARGIN - 120
        color = ACCENT if badge == "(A)" else WARN
        c.draw.rounded_rectangle((bx, y + 28, bx + 52, y + 58), radius=6, fill=hex_rgb(PANEL_ALT), outline=hex_rgb(color), width=2)
        c.draw.text((bx + 10, y + 36), badge, fill=hex_rgb(color), font=c.font_mono)
        c.draw.text((W_FULL - MARGIN - 70, y + 36), dur, fill=hex_rgb(MUTED), font=c.font_small)
        y += 100
    c.draw_paragraph(
        "(V) = VAPI live row · (A) = archived on GitHub / redeployed on Vercel\n"
        "Pull latest recordings → repository_dispatch → badges flip V → A",
        MARGIN,
        y + 20,
        W_FULL - 2 * MARGIN,
        color=ACCENT,
    )


def fig07(c: Canvas):
    nodes = [
        (220, 220, "VAPI end-of-call", "webhook POST"),
        (500, 220, "Next.js /api/webhook", "end-of-call-report"),
        (780, 220, "GitHub Action", "archive-recordings"),
        (1060, 220, "git push main", "index + audio"),
        (1300, 220, "Vercel", "auto redeploy"),
    ]
    for i, (cx, cy, a, b) in enumerate(nodes):
        c.draw_flow_box(cx, cy, a, b, w=210, h=64)
        if i < len(nodes) - 1:
            c.arrow_h(cx + 110, cy, nodes[i + 1][0] - 110)
    c.panel(MARGIN, 320, W_FULL - MARGIN, H_FULL - MARGIN)
    lines = [
        "triggerArchiveWorkflow(call.id)  →  repository_dispatch: archive-recordings",
        ".github/workflows/archive-recordings.yml  →  scripts/archive-recordings.js",
        "web/public/call-archive/index.json + audio/*.wav|mp3",
        "Weekly cron (Sun 03:15 UTC) backup before VAPI ~14-day retention",
    ]
    c.draw_paragraph("\n".join(lines), MARGIN + INNER_PAD, 350, W_FULL - 2 * MARGIN - 40, font=c.font_mono_sm)


def fig08(c: Canvas):
    c.panel(MARGIN, 100, W_FULL - MARGIN, 340)
    c.draw.text((MARGIN + 24, 120), "▶ Recording", fill=hex_rgb(ACCENT), font=load_font(24))
    c.draw.rectangle((MARGIN + 24, 170, W_FULL - MARGIN - 24, 200), fill=hex_rgb(BORDER))
    c.draw.rectangle((MARGIN + 24, 170, MARGIN + 420, 200), fill=hex_rgb(ACCENT))
    c.draw.text((MARGIN + 24, 220), "0:00 ———————●———————— 2:37", fill=hex_rgb(MUTED), font=c.font_small)
    c.panel(MARGIN, 360, W_FULL - MARGIN, H_FULL - MARGIN)
    c.draw.text((MARGIN + 24, 380), "Transcript (from archive index)", fill=hex_rgb(ACCENT), font=c.font_sub)
    transcript = (
        "Alex: Hey. Alex from Vantora. We help teams stop drowning in follow ups. "
        "Got a quick 30 seconds?\nProspect: Now can you call back?\n"
        "Alex: Absolutely. What time works best for you for a quick callback?\n"
        "Prospect: Tomorrow at 7PM.\n…"
    )
    c.draw_paragraph(transcript, MARGIN + 24, 415, W_FULL - 2 * MARGIN - 40, font=c.font_mono_sm, color=WHITE)


def fig09(c: Canvas):
    lines = read_text("web/lib/englishSystemPrompt.ts", 22).splitlines()
    c.draw.text((MARGIN, 100), "web/lib/englishSystemPrompt.ts — opening rules", fill=hex_rgb(MUTED), font=c.font_sub)
    c.draw_code(lines, MARGIN, 130, W_FULL - 2 * MARGIN, H_FULL - MARGIN - 30, highlight=[6, 7, 8, 23])


def fig10(c: Canvas):
    lines = read_text("web/lib/urduSystemPrompt.ts", 26).splitlines()
    c.draw.text((MARGIN, 100), "web/lib/urduSystemPrompt.ts — Roman Urdu + never silent", fill=hex_rgb(MUTED), font=c.font_sub)
    c.draw_code(lines, MARGIN, 130, W_FULL - 2 * MARGIN, H_FULL - MARGIN - 30, highlight=[10, 17, 18, 19])


def fig11(c: Canvas):
    c.panel(MARGIN, 100, (W_FULL - MARGIN) // 2 - 10, 380)
    c.draw.text((MARGIN + 20, 120), "English — LiveKit smart endpointing", fill=hex_rgb(ACCENT), font=c.font_sub)
    en = read_text("web/lib/speechConfig.ts", 93).splitlines()[72:82]
    c.draw_code(en, MARGIN + 10, 150, (W_FULL - MARGIN) // 2 - 30, 320)
    rx = (W_FULL + MARGIN) // 2 + 10
    c.panel(rx, 100, W_FULL - MARGIN, 380)
    c.draw.text((rx + 20, 120), "Urdu — transcription endpointing only", fill=hex_rgb(ACCENT), font=c.font_sub)
    ur = read_text("web/lib/speechConfig.ts", 93).splitlines()[83:92]
    c.draw_code(ur, rx + 10, 150, W_FULL - MARGIN - rx - 20, 320)
    c.draw_paragraph(
        "deepgramTranscriber: endpointing 250ms (EN) / 400ms (UR) · keywords per language\n"
        "VOICE_SPEED = 0.9 · Elliot V2 · clientManagedIdle in TalkToAgent",
        MARGIN,
        410,
        W_FULL - 2 * MARGIN,
        color=MUTED,
        font=c.font_small,
    )


def fig12(c: Canvas):
    lines = read_text("web/components/TalkToAgent.tsx", 430).splitlines()[377:429]
    c.draw.text((MARGIN, 100), "buildOverrides(lang) — Groq + Elliot per language", fill=hex_rgb(MUTED), font=c.font_sub)
    c.draw_code(lines, MARGIN, 130, W_FULL - 2 * MARGIN, H_FULL - MARGIN - 30, highlight=[2, 12, 17, 35])


def fig13(c: Canvas):
    lines = read_text("web/app/api/outbound/route.ts", 70).splitlines()[15:55]
    c.draw.text((MARGIN, 100), "POST /api/outbound — server-side VAPI dial", fill=hex_rgb(MUTED), font=c.font_sub)
    c.draw_code(lines, MARGIN, 130, W_FULL - 2 * MARGIN, H_FULL - MARGIN - 30)


def fig14(c: Canvas):
    lines = read_text("web/app/api/webhook/route.ts", 91).splitlines()
    c.draw.text((MARGIN, 100), "End-of-call webhook → local log + GitHub dispatch", fill=hex_rgb(MUTED), font=c.font_sub)
    c.draw_code(lines, MARGIN, 130, W_FULL - 2 * MARGIN, H_FULL - MARGIN - 30, highlight=[11, 65, 71, 72])


def fig15(c: Canvas):
    c.draw_paragraph(
        "Vercel serverless FS is read-only — rename/delete mutate GitHub archive, then redeploy.",
        MARGIN,
        100,
        W_FULL - 2 * MARGIN,
        color=MUTED,
    )
    snippet = read_text("web/lib/githubSync.ts", 290).splitlines()[246:285]
    c.draw_code(snippet, MARGIN, 140, W_FULL - 2 * MARGIN, 520)
    bullets = [
        "pushCallRenameToGitHub → index.json displayName",
        "pushCallDeleteToGitHub → deleted.json tombstone + remove audio",
        "GET archive via GitHub API before Vercel disk catches up",
    ]
    y = 540
    for b in bullets:
        c.draw.text((MARGIN + 12, y), "• " + b, fill=hex_rgb(WHITE), font=c.font_small)
        y += 28


def fig16(c: Canvas):
    tree = [
        "web/",
        "├── app/",
        "│   ├── page.tsx              ← home (Call Agent + Outbound)",
        "│   ├── layout.tsx            ← Vantora shell",
        "│   ├── calls/",
        "│   │   ├── page.tsx          ← Call History",
        "│   │   └── [id]/page.tsx     ← Call detail + player",
        "│   └── api/",
        "│       ├── calls/            ← list, detail, recording",
        "│       ├── outbound/         ← phone dial",
        "│       ├── webhook/          ← end-of-call archive trigger",
        "│       └── archive/sync/     ← manual pull",
        "├── components/",
        "│   ├── TalkToAgent.tsx",
        "│   ├── CallHistory.tsx",
        "│   └── CallDetail.tsx",
        "└── lib/",
        "    ├── speechConfig.ts",
        "    ├── englishSystemPrompt.ts",
        "    ├── urduSystemPrompt.ts",
        "    ├── githubSync.ts",
        "    └── archive.ts",
    ]
    c.panel(MARGIN, 100, W_FULL - MARGIN, H_FULL - MARGIN)
    c.draw_code(tree, MARGIN + INNER_PAD, 120, W_FULL - 2 * MARGIN - 40, H_FULL - MARGIN - 140)


def fig17(c: Canvas):
    pub = [
        "NEXT_PUBLIC_VAPI_PUBLIC_KEY",
        "NEXT_PUBLIC_VAPI_ASSISTANT_ID",
        "(exposed to browser — VAPI web SDK)",
    ]
    sec = [
        "VAPI_API_KEY",
        "VAPI_PHONE_NUMBER_ID",
        "GROQ_API_KEY (via VAPI config)",
        "GITHUB_TOKEN",
        "GITHUB_REPO",
        "ARCHIVE_SYNC_SECRET (optional)",
        "Never commit .env — use Vercel env UI",
    ]
    c.panel(MARGIN, 100, (W_FULL - MARGIN) // 2 - 8, H_FULL - MARGIN)
    c.draw.text((MARGIN + 20, 120), "Public (NEXT_PUBLIC_*)", fill=hex_rgb(ACCENT), font=c.font_sub)
    y = 160
    for line in pub:
        c.draw.text((MARGIN + 28, y), line, fill=hex_rgb(WHITE), font=c.font_mono_sm)
        y += 32
    rx = (W_FULL + MARGIN) // 2 + 8
    c.panel(rx, 100, W_FULL - MARGIN, H_FULL - MARGIN)
    c.draw.text((rx + 20, 120), "Secret (server only)", fill=hex_rgb(WARN), font=c.font_sub)
    y = 160
    for line in sec:
        c.draw.text((rx + 28, y), line, fill=hex_rgb(WHITE), font=c.font_mono_sm)
        y += 32
    c.draw.text((MARGIN + 20, H_FULL - 80), "Source: .env.example (placeholders only — no real secrets)", fill=hex_rgb(MUTED), font=c.font_small)


def fig18(c: Canvas):
    idx_path = ROOT / "web" / "public" / "call-archive" / "index.json"
    demo_count = 0
    live_count = 0
    updated = "—"
    if idx_path.exists():
        data = json.loads(idx_path.read_text(encoding="utf-8"))
        updated = data.get("updatedAt", "—")[:19]
        calls = data.get("calls", [])
        live_count = len(calls)
        audio_dir = ROOT / "web" / "public" / "call-archive" / "audio"
        demo_count = len(list(audio_dir.glob("demo-*.wav"))) if audio_dir.is_dir() else 0
    c.draw_paragraph(
        f"Permanent demo + synced recordings under web/public/call-archive/\n"
        f"index.json updatedAt: {updated}\n"
        f"Archived rows in index: {live_count} · demo-*.wav seeds: {demo_count}",
        MARGIN,
        100,
        W_FULL - 2 * MARGIN,
    )
    seeds = ["demo-web-001…006", "demo-outbound-001…005", "demo-inbound-001…005", "deleted.json tombstones"]
    positions = [(MARGIN, 250), (MARGIN + 450, 250), (MARGIN, 400), (MARGIN + 450, 400)]
    for s, (x1, y1) in zip(seeds, positions):
        c.panel(x1, y1, x1 + 400, y1 + 100)
        c.draw.text((x1 + 24, y1 + 38), s, fill=hex_rgb(ACCENT), font=c.font_body)


def fig19(c: Canvas):
    c.draw.text((MARGIN, 95), "Mobile viewport — badge row wraps cleanly", fill=hex_rgb(MUTED), font=c.font_sub)
    c.panel(480, 100, 960, H_FULL - 40)
    c.draw.text((520, 120), "Call History", fill=hex_rgb(WHITE), font=load_font(22))
    y = 170
    for badge, label in [("(A)", "Archived"), ("(V)", "Live"), ("Sample", "demo-web")]:
        c.draw.rounded_rectangle((520, y, 580, y + 36), radius=6, outline=hex_rgb(ACCENT), width=2)
        c.draw.text((532, y + 8), badge, fill=hex_rgb(ACCENT), font=c.font_mono_sm)
        c.draw.text((600, y + 8), label, fill=hex_rgb(WHITE), font=c.font_small)
        y += 56
    c.draw_paragraph(
        "globals.css: clamp() typography · flex-wrap on .call-actions > .badge\n"
        "source-a / source-v badge colors for archive vs live",
        MARGIN,
        180,
        400,
        font=c.font_small,
        color=MUTED,
    )


def fig20(c: Canvas):
    c.draw_flow_box(360, 200, "User clicks Refresh", "", w=240)
    c.arrow_h(480, 200, 620)
    c.draw_flow_box(720, 200, "fetch /api/calls?hard=1", "no-cache headers", w=260)
    c.arrow_h(860, 200, 1000)
    c.draw_flow_box(1100, 200, "startTransition(setCalls)", "UI never blanks", w=260)
    snippet = [
        "// Ctrl+F5-grade data refresh — never blank the list",
        'fetch(`/api/calls?hard=1&t=${bust}`, {',
        '  cache: "reload",',
        '  headers: { "X-Vantora-Refresh": "hard", ... }',
        "});",
        "// Hard refresh always applies list (badges/sources)",
    ]
    c.draw_code(snippet, MARGIN, 320, W_FULL - 2 * MARGIN, H_FULL - MARGIN - 20)
    c.draw.text((MARGIN, 280), "CallHistory.tsx — hard fetch without full page reload (no blink)", fill=hex_rgb(ACCENT), font=c.font_sub)


def fig21(c: Canvas):
    steps = [
        ("1", "Copy .env.example → .env (VAPI + Groq keys)"),
        ("2", "cd web && npm install"),
        ("3", "Double-click RUN.cmd (root) — checks Node + .env"),
        ("4", "npm run dev → http://localhost:3000"),
        ("5", "Vercel: Root Directory = web, import env vars"),
        ("6", "Set VAPI webhook URL → /api/webhook"),
    ]
    y = 120
    for num, text in steps:
        c.draw.ellipse((MARGIN, y, MARGIN + 40, y + 40), fill=hex_rgb(ACCENT))
        c.draw.text((MARGIN + 14, y + 8), num, fill=hex_rgb(BG), font=c.font_body)
        c.draw.text((MARGIN + 56, y + 10), text, fill=hex_rgb(WHITE), font=c.font_body)
        y += 58
    c.panel(MARGIN, 480, W_FULL - MARGIN, H_FULL - MARGIN)
    run = read_text("RUN.cmd", 25).splitlines()[:12]
    c.draw.text((MARGIN + 20, 500), "RUN.cmd excerpt", fill=hex_rgb(ACCENT), font=c.font_sub)
    c.draw_code(run, MARGIN + 10, 530, W_FULL - 2 * MARGIN - 20, 200)


def fig22(c: Canvas):
    checks = [
        ("✓", "Live demo loads"),
        ("✓", "Call Agent EN / UR — language lock before call"),
        ("✓", "Hangup: call cut / goodbye → ~2s after Allah hafiz"),
        ("✓", "Callback phrase does NOT hang up"),
        ("✓", "History + recording play + delete"),
        ("○", "Outbound US E2E — blocked by free-number daily limit"),
    ]
    y = 110
    c.draw.text((MARGIN, y), "README §15 Testing checklist", fill=hex_rgb(ACCENT), font=c.font_sub)
    y += 40
    for mark, item in checks:
        color = ACCENT if mark == "✓" else WARN
        c.draw.text((MARGIN, y), mark, fill=hex_rgb(color), font=load_font(20))
        c.draw.text((MARGIN + 36, y), item, fill=hex_rgb(WHITE), font=c.font_body)
        y += 44


def fig23(c: Canvas):
    limits = [
        ("VAPI credits", "One-time ~$10 — does NOT renew daily; top up when empty"),
        ("Free US outbound", "~10 attempts/day — separate from wallet balance"),
        ("International", "Free VAPI number = US +1 only"),
        ("Elliot + Urdu", "Replies must be Roman Urdu Latin — Arabic script freezes TTS"),
        ("Retention", "VAPI ~14 days — GitHub archive + weekly cron for permanence"),
    ]
    y = 110
    for title, body in limits:
        c.panel(MARGIN, y, W_FULL - MARGIN, y + 110)
        c.draw.text((MARGIN + 24, y + 18), title, fill=hex_rgb(ACCENT), font=c.font_body)
        c.draw_paragraph(body, MARGIN + 24, y + 50, W_FULL - 2 * MARGIN - 40, font=c.font_small, color=MUTED)
        y += 125


def fig24(c: Canvas):
    features = [
        "Live Vercel demo — Call Agent (EN/Urdu) with language lock",
        "Real recordings + transcripts in Call History",
        "Permanent archive pipeline (webhook → GitHub → Vercel)",
        "Outbound API route + phone validation (US limits documented)",
        "Client hangup detection, idle handling, speechConfig tuning",
        "Recruiter-ready README + assessment docs",
    ]
    c.draw.text((MARGIN, 100), "Shipped for Likva9 assessment · Alex @ Vantora", fill=hex_rgb(ACCENT), font=c.font_sub)
    c.draw.text((MARGIN, 130), "https://web-rouge-xi-23.vercel.app", fill=hex_rgb(WHITE), font=c.font_body)
    y = 180
    for f in features:
        c.draw.rounded_rectangle((MARGIN, y, MARGIN + 28, y + 28), radius=4, fill=hex_rgb(ACCENT_DIM))
        c.draw.text((MARGIN + 8, y + 4), "✓", fill=hex_rgb(WHITE), font=c.font_small)
        c.draw_paragraph(f, MARGIN + 44, y + 2, W_FULL - 2 * MARGIN - 50, font=c.font_body)
        y += 52
    c.panel(MARGIN, y + 20, W_FULL - MARGIN, H_FULL - MARGIN)
    c.draw.text((MARGIN + 24, y + 44), "Contact: contact@likva9.tech · GitHub: rohaan2802/Cold_Calling_Agent", fill=hex_rgb(MUTED), font=c.font_small)


def main():
    register(1, "01_repo_folder_structure.png", "Repository folder structure", "Top-level map of web/, scripts/, docs/, prompts/, and CI.", "overview", fig01)
    register(2, "02_voice_pipeline_architecture.png", "Voice pipeline architecture", "Browser/phone through VAPI, Deepgram, Groq, and Elliot TTS.", "architecture", fig02)
    register(3, "03_call_agent_english_ui_mock.png", "Call Agent — English UI", "Browser voice UI mock with language lock and notes from TalkToAgent.", "product", fig03)
    register(4, "04_call_agent_urdu_language_lock.png", "Call Agent — Urdu language lock", "Roman Urdu rules and TTS constraints for Elliot.", "product", fig04)
    register(5, "05_outbound_dialer_flow.png", "Outbound dialer flow", "Steps from phone input through POST /api/outbound to VAPI call.", "product", fig05)
    register(6, "06_call_history_av_badges.png", "Call History (A)/(V) badges", "Hybrid live VAPI vs permanent archive badge semantics.", "product", fig06)
    register(7, "07_permanent_archive_pipeline.png", "Permanent archive pipeline", "Webhook → GitHub Action → push → Vercel redeploy.", "ops", fig07)
    register(8, "08_recording_player_transcript.png", "Recording player & transcript", "Playback chrome with transcript excerpt from archive.", "product", fig08)
    register(9, "09_english_system_prompt_excerpt.png", "englishSystemPrompt excerpt", "First lines of English Alex system prompt from repo.", "code", fig09)
    register(10, "10_urdu_system_prompt_excerpt.png", "urduSystemPrompt excerpt", "Urdu prompt rules: Roman Urdu and never-silent.", "code", fig10)
    register(11, "11_speech_config_turn_taking.png", "speechConfig turn-taking", "LiveKit endpointing (EN) vs Urdu transcription plan.", "code", fig11)
    register(12, "12_talk_to_agent_build_overrides.png", "TalkToAgent buildOverrides", "Per-language Groq model and Elliot voice overrides.", "code", fig12)
    register(13, "13_outbound_api_route_snippet.png", "Outbound API route", "Server route that starts VAPI phone calls.", "code", fig13)
    register(14, "14_webhook_end_of_call_archive.png", "Webhook end-of-call archive", "end-of-call-report handler and GitHub dispatch.", "code", fig14)
    register(15, "15_github_sync_rename_delete_vercel.png", "githubSync on read-only Vercel", "Rename/delete via GitHub when Vercel FS cannot write.", "ops", fig15)
    register(16, "16_nextjs_app_router_map.png", "Next.js App Router map", "app/, components/, and lib/ responsibilities.", "architecture", fig16)
    register(17, "17_env_vars_public_vs_secret.png", "Environment variables", "Public NEXT_PUBLIC_* vs server secrets (.env.example).", "ops", fig17)
    register(18, "18_demo_call_archive_seed_overview.png", "Demo archive seed overview", "call-archive index and demo-wav seed files.", "ops", fig18)
    register(19, "19_mobile_call_history_badges_row.png", "Mobile Call History badges", "Responsive badge row and source styling.", "product", fig19)
    register(20, "20_refresh_hard_fetch_no_blink.png", "Hard refresh (no blink)", "CallHistory hard fetch without blanking the list.", "code", fig20)
    register(21, "21_setup_npm_run_vercel.png", "Local setup & Vercel", "npm install, RUN.cmd, and deployment steps.", "ops", fig21)
    register(22, "22_testing_checklist_en_ur_outbound.png", "Testing checklist", "EN/UR verified items and outbound limit note.", "ops", fig22)
    register(23, "23_limitations_credits_elliot_urdu.png", "Known limitations", "Credits, outbound caps, and Elliot Urdu TTS.", "results", fig23)
    register(24, "24_results_summary_recruiter.png", "Results summary", "Shipped features and live links for recruiters.", "results", fig24)

    SCREENSHOTS.mkdir(parents=True, exist_ok=True)
    THUMBS.mkdir(parents=True, exist_ok=True)

    manifest = []
    for meta in FIGURES_META:
        canvas = Canvas(meta["title"])
        meta["_draw"](canvas)
        out = SCREENSHOTS / meta["file"]
        canvas.img.save(out, "PNG")
        thumb = canvas.img.resize((W_THUMB, H_THUMB), Image.Resampling.LANCZOS)
        thumb_path = THUMBS / meta["file"]
        thumb.save(thumb_path, "PNG")
        manifest.append({k: meta[k] for k in ("id", "file", "title", "caption", "category")})

    figures_json = ROOT / "assets" / "figures.json"
    figures_json.write_text(json.dumps({"figures": manifest}, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {len(manifest)} figures to {SCREENSHOTS} and {THUMBS}")
    print(f"Wrote {figures_json}")
    print()
    print(f"{'Kind':<8} {'File':<48} {'Width':>6} {'Height':>6}")
    print("-" * 72)
    rows = []
    for meta in manifest:
        for kind, folder in (("full", SCREENSHOTS), ("thumb", THUMBS)):
            p = folder / meta["file"]
            with Image.open(p) as im:
                w, h = im.size
            rows.append((kind, meta["file"], w, h))
    for kind, name, w, h in rows:
        ok = "OK" if (kind == "full" and w == W_FULL and h == H_FULL) or (kind == "thumb" and w == W_THUMB and h == H_THUMB) else "BAD"
        print(f"{kind:<8} {name:<48} {w:>6} {h:>6}  {ok}")
    bad = [r for r in rows if r[3] != (H_FULL if r[0] == "full" else H_THUMB) or r[2] != (W_FULL if r[0] == "full" else W_THUMB)]
    if bad:
        sys.exit(1)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())