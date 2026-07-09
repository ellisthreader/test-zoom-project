import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const width = 1600;
const height = 1550;

const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function text(x, y, value, size = 32, weight = 700, fill = "#10162f", extra = "") {
  return `<text x="${x}" y="${y}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${escapeXml(value)}</text>`;
}

function rect(x, y, w, h, r, fill, stroke = "none", extra = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
}

function line(x1, y1, x2, y2, stroke = "#d7e2f2", strokeWidth = 4) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;
}

function pill(x, y, label, fill, color = "#0f172a", w = null, h = 34) {
  const pillWidth = w ?? Math.max(110, label.length * 11 + 34);
  return [
    rect(x, y, pillWidth, h, h / 2, fill),
    text(x + 17, y + Math.round(h * 0.68), label, Math.round(h * 0.46), 850, color)
  ].join("");
}

function claraAvatar(cx, cy, r = 42) {
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#0b5cff"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 7}" fill="#eaf2ff" opacity="0.98"/>
    <circle cx="${cx - r * 0.3}" cy="${cy - r * 0.12}" r="${r * 0.11}" fill="#0b5cff"/>
    <circle cx="${cx + r * 0.3}" cy="${cy - r * 0.12}" r="${r * 0.11}" fill="#0b5cff"/>
    <path d="M ${cx - r * 0.34} ${cy + r * 0.22} Q ${cx} ${cy + r * 0.44} ${cx + r * 0.34} ${cy + r * 0.22}" fill="none" stroke="#0b5cff" stroke-width="${r * 0.1}" stroke-linecap="round"/>
    <path d="M ${cx - r * 0.52} ${cy - r * 0.58} H ${cx + r * 0.52} Q ${cx + r * 0.72} ${cy - r * 0.58} ${cx + r * 0.72} ${cy - r * 0.38} V ${cy + r * 0.48} Q ${cx + r * 0.72} ${cy + r * 0.68} ${cx + r * 0.52} ${cy + r * 0.68} H ${cx - r * 0.52} Q ${cx - r * 0.72} ${cy + r * 0.68} ${cx - r * 0.72} ${cy + r * 0.48} V ${cy - r * 0.38} Q ${cx - r * 0.72} ${cy - r * 0.58} ${cx - r * 0.52} ${cy - r * 0.58} Z" fill="none" stroke="#0b5cff" stroke-width="${r * 0.09}"/>
  `;
}

function browserBar() {
  return `
    ${rect(0, 0, 1000, 58, 24, "#ffffff", "#dce8f7")}
    <circle cx="34" cy="29" r="8" fill="#ff6b6b"/>
    <circle cx="60" cy="29" r="8" fill="#f6c453"/>
    <circle cx="86" cy="29" r="8" fill="#20c997"/>
    ${text(126, 36, "RelayClarity", 18, 900)}
    ${text(264, 36, "Clara agent workspace", 15, 760, "#40506a")}
    ${pill(810, 16, "Clara live preview", "#e8f1ff", "#0b5cff", 154, 28)}
  `;
}

function configureUi() {
  return `
    ${rect(0, 0, 1000, 620, 26, "#f8fbff")}
    ${browserBar()}
    ${rect(36, 94, 576, 486, 22, "#ffffff", "#dbe7f6")}
    ${text(70, 148, "Teach Clara your business", 38, 920)}
    ${text(72, 188, "Bookings, emergencies, FAQs, opening hours.", 20, 720, "#40506a")}
    ${rect(72, 226, 474, 106, 16, "#f7faff", "#dce8f7")}
    ${text(98, 258, "Business type", 17, 850, "#64748b")}
    ${text(98, 286, "Dental clinic", 23, 880)}
    ${text(98, 316, "Urgent appointments", 21, 820)}
    ${rect(72, 354, 474, 112, 16, "#f7faff", "#dce8f7")}
    ${text(98, 386, "Agent context", 17, 850, "#64748b")}
    ${text(98, 416, "Open 8am-6pm Mon-Fri", 20, 820)}
    ${text(98, 444, "Escalate pain or swelling", 20, 820)}
    ${text(98, 472, "Answer pricing and FAQs", 20, 820)}
    ${rect(72, 494, 226, 58, 16, "#eaf2ff", "#bfd5ff")}
    ${text(98, 530, "Bookings", 20, 880, "#0b5cff")}
    ${rect(320, 494, 226, 58, 16, "#ecfdf5", "#bdebd7")}
    ${text(346, 530, "Emergencies", 20, 880, "#128064")}
    ${rect(638, 112, 280, 210, 24, "#101a33", "#172554")}
    ${claraAvatar(778, 196, 45)}
    ${text(718, 270, "Clara", 36, 920, "#ffffff")}
    ${text(692, 302, "AI phone + chat agent", 16, 760, "#bdd3ff")}
    ${pill(716, 306, "Drafting brief", "#143f8f", "#ffffff", 136, 28)}
    ${rect(638, 356, 280, 224, 22, "#ffffff", "#dbe7f6")}
    ${text(674, 410, "Agent brief", 30, 920)}
    ${text(674, 446, "Approved answers,", 18, 740, "#40506a")}
    ${text(674, 474, "handoffs, and FAQs.", 18, 740, "#40506a")}
    ${line(674, 508, 862, 508, "#bfd5ff", 6)}
    ${line(674, 540, 840, 540, "#bfd5ff", 6)}
    ${pill(674, 546, "73% brief complete", "#ecfdf5", "#128064", 188, 30)}
  `;
}

function simulateUi() {
  return `
    ${rect(0, 0, 1000, 620, 26, "#f8fbff")}
    ${browserBar()}
    ${rect(38, 96, 284, 486, 22, "#ffffff", "#dbe7f6")}
    ${text(72, 152, "Scenario lab", 40, 920)}
    ${text(74, 190, "Try customer questions", 17, 720, "#40506a")}
    ${rect(72, 238, 216, 70, 18, "#fff3f2", "#ffd2cc")}
    ${text(96, 266, "Emergency", 17, 890, "#c2410c")}
    ${text(96, 290, "appointment", 17, 890, "#c2410c")}
    ${text(96, 306, "Selected test", 14, 760, "#7c2d12")}
    ${rect(72, 328, 216, 70, 18, "#f7faff", "#dce8f7")}
    ${text(96, 360, "Order update", 20, 870)}
    ${text(96, 386, "Regression test", 15, 760, "#64748b")}
    ${rect(72, 418, 216, 70, 18, "#f7faff", "#dce8f7")}
    ${text(96, 450, "New lead", 20, 870)}
    ${text(96, 476, "Qualification test", 15, 760, "#64748b")}
    ${pill(76, 532, "3 tests ready", "#ecfdf5", "#128064", 150, 38)}
    ${rect(356, 96, 410, 486, 22, "#ffffff", "#dbe7f6")}
    ${rect(386, 126, 330, 70, 18, "#101a33")}
    ${claraAvatar(428, 160, 26)}
    ${text(470, 154, "Clara test", 24, 900, "#ffffff")}
    ${text(470, 182, "Customer chat + phone response", 15, 760, "#bdd3ff")}
    ${rect(420, 252, 260, 88, 18, "#e8f1ff", "#bfd5ff")}
    ${text(444, 286, "Customer", 15, 850, "#64748b")}
    ${text(444, 314, "I need an emergency", 18, 790)}
    ${text(444, 338, "appointment today.", 18, 790)}
    ${rect(474, 380, 250, 126, 18, "#0b5cff")}
    ${text(498, 414, "Clara", 15, 850, "#dcecff")}
    ${text(498, 442, "I can help. Are you", 17, 820, "#ffffff")}
    ${text(498, 468, "in pain now?", 17, 820, "#ffffff")}
    ${text(498, 494, "I can check urgent slots.", 16, 820, "#ffffff")}
    ${pill(474, 530, "Clara flags urgent handoff", "#ecfdf5", "#128064", 250, 34)}
    ${rect(800, 118, 140, 438, 22, "#ffffff", "#dbe7f6")}
    ${text(824, 168, "Score", 28, 920)}
    <circle cx="870" cy="260" r="46" fill="none" stroke="#dbe7f6" stroke-width="16"/>
    <circle cx="870" cy="260" r="46" fill="none" stroke="#14b8a6" stroke-width="16" stroke-dasharray="231 289" stroke-linecap="round" transform="rotate(-90 870 260)"/>
    ${text(844, 270, "88%", 22, 920, "#128064")}
    ${pill(826, 344, "Clear", "#ecfdf5", "#128064", 76, 28)}
    ${pill(826, 396, "Safe", "#e8f1ff", "#0b5cff", 76, 28)}
    ${pill(826, 448, "Handoff", "#fff7ed", "#c2410c", 98, 28)}
  `;
}

function observeUi() {
  return `
    ${rect(0, 0, 1000, 620, 26, "#f8fbff")}
    ${browserBar()}
    ${rect(38, 96, 924, 486, 22, "#ffffff", "#dbe7f6")}
    ${text(80, 152, "Conversation monitor", 40, 920)}
    ${text(82, 190, "Chats, calls, handoffs, and missed requests stay visible.", 19, 720, "#40506a")}
    ${pill(780, 128, "Clara is live", "#ecfdf5", "#128064", 140, 30)}
    ${rect(82, 244, 184, 86, 18, "#e8f1ff", "#bfd5ff")}
    ${text(110, 286, "24", 34, 920, "#0b5cff")}
    ${text(110, 312, "handled by Clara", 15, 820, "#40506a")}
    ${rect(292, 244, 184, 86, 18, "#ecfdf5", "#bdebd7")}
    ${text(320, 286, "7", 34, 920, "#128064")}
    ${text(320, 312, "live chats", 15, 820, "#40506a")}
    ${rect(502, 244, 184, 86, 18, "#fff7ed", "#fed7aa")}
    ${text(530, 286, "3", 34, 920, "#c2410c")}
    ${text(530, 312, "handoffs", 15, 820, "#40506a")}
    ${rect(712, 244, 184, 86, 18, "#fff3f2", "#ffd2cc")}
    ${text(740, 286, "1", 34, 920, "#dc2626")}
    ${text(740, 312, "missed request", 15, 820, "#40506a")}
    ${rect(82, 374, 540, 156, 18, "#f7faff", "#dce8f7")}
    ${text(114, 420, "Important activity", 26, 920)}
    ${rect(114, 444, 464, 34, 10, "#ffffff", "#dbe7f6")}
    ${text(132, 468, "Emergency appointment", 16, 870)}
    ${pill(442, 451, "Clara escalated", "#fff7ed", "#c2410c", 112, 20)}
    ${rect(114, 488, 464, 34, 10, "#ffffff", "#dbe7f6")}
    ${text(132, 512, "New lead from website chat", 16, 870)}
    ${pill(442, 495, "Qualified", "#ecfdf5", "#128064", 90, 20)}
    ${rect(662, 366, 230, 164, 18, "#101a33", "#172554")}
    ${claraAvatar(708, 420, 31)}
    ${text(756, 412, "Clara", 25, 920, "#ffffff")}
    ${text(756, 440, "monitoring calls", 16, 760, "#bdd3ff")}
    ${line(692, 468, 844, 468, "#385992", 5)}
    ${line(692, 496, 812, 496, "#385992", 5)}
    ${pill(692, 508, "Review handoff", "#0b5cff", "#ffffff", 134, 28)}
  `;
}

function officeBackground(accent = "#0b5cff") {
  return `
    <rect width="${width}" height="${height}" fill="url(#room)"/>
    <rect x="0" y="1010" width="${width}" height="540" fill="url(#desk)"/>
    <rect x="0" y="1010" width="${width}" height="2" fill="#ffffff" opacity="0.55"/>
    <rect x="94" y="104" width="358" height="640" rx="26" fill="#ffffff" opacity="0.42"/>
    <rect x="138" y="146" width="270" height="556" rx="18" fill="#dfeaf8" opacity="0.42"/>
    <rect x="1110" y="150" width="336" height="460" rx="26" fill="#ffffff" opacity="0.36"/>
    <rect x="1162" y="206" width="230" height="348" rx="16" fill="#d9edf0" opacity="0.36"/>
    <circle cx="180" cy="1172" r="72" fill="#15324a" opacity="0.14"/>
    <ellipse cx="1336" cy="1168" rx="120" ry="36" fill="#0f172a" opacity="0.10"/>
    <path d="M 1268 1096 C 1296 1034 1382 1032 1400 1098 C 1368 1118 1302 1124 1268 1096 Z" fill="#0f8f79" opacity="0.58"/>
    <path d="M 1360 1096 C 1384 1032 1464 1044 1472 1118 C 1438 1126 1392 1126 1360 1096 Z" fill="#166c58" opacity="0.46"/>
    <rect x="1288" y="1122" width="136" height="114" rx="16" fill="#ffffff" opacity="0.86"/>
    <circle cx="1270" cy="258" r="300" fill="${accent}" opacity="0.08" filter="url(#softBlur)"/>
    <circle cx="250" cy="1240" r="260" fill="#14b8a6" opacity="0.08" filter="url(#softBlur)"/>
  `;
}

function screenWithUi(x, y, w, h, ui, clipId) {
  const sx = w / 1000;
  const sy = h / 620;
  return `
    <clipPath id="${clipId}">${rect(x, y, w, h, 22, "#fff")}</clipPath>
    <g clip-path="url(#${clipId})">
      <g transform="translate(${x} ${y}) scale(${sx} ${sy})">${ui}</g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="url(#screenShine)" opacity="0.2"/>
    </g>
  `;
}

function laptopCard(ui, accent = "#0b5cff") {
  const screenX = 224;
  const screenY = 244;
  const screenW = 1152;
  const screenH = 714;
  return base(`
    ${officeBackground(accent)}
    <g filter="url(#deviceShadow)">
      ${rect(172, 182, 1256, 848, 46, "url(#deviceBezel)", "#111827", 'stroke-width="2"')}
      ${screenWithUi(screenX, screenY, screenW, screenH, ui, "screenClipLaptop")}
      <circle cx="800" cy="213" r="7" fill="#253047"/>
    </g>
    <g filter="url(#bodyShadow)">
      <path d="M 86 1050 H 1514 L 1418 1302 Q 1398 1342 1342 1342 H 258 Q 202 1342 182 1302 Z" fill="url(#aluminum)" stroke="#d7dee9" stroke-width="2"/>
      <rect x="432" y="1094" width="736" height="132" rx="18" fill="#d9e1ec" opacity="0.62"/>
      ${keyboardRows(438, 1100)}
      <rect x="630" y="1246" width="340" height="58" rx="18" fill="#cbd5e1" opacity="0.9" stroke="#aeb9c8"/>
      <path d="M 172 1050 H 1428" stroke="#f8fafc" stroke-width="8" stroke-linecap="round" opacity="0.78"/>
    </g>
  `);
}

function monitorCard(ui, accent = "#14b8a6") {
  const screenX = 188;
  const screenY = 220;
  const screenW = 1224;
  const screenH = 759;
  return base(`
    ${officeBackground(accent)}
    <g filter="url(#deviceShadow)">
      ${rect(132, 160, 1336, 882, 38, "url(#deviceBezel)", "#111827", 'stroke-width="2"')}
      ${screenWithUi(screenX, screenY, screenW, screenH, ui, "screenClipMonitor")}
      <rect x="752" y="1042" width="96" height="194" rx="22" fill="url(#stand)" stroke="#b8c3d1"/>
      <path d="M 612 1248 H 988 Q 1048 1248 1078 1306 H 522 Q 552 1248 612 1248 Z" fill="url(#aluminum)" stroke="#b8c3d1"/>
    </g>
    <g filter="url(#bodyShadow)">
      <rect x="416" y="1338" width="598" height="86" rx="34" fill="#edf2f8" stroke="#cbd5e1"/>
      ${keyboardRows(454, 1358, 4, 26, 38, 15)}
      <ellipse cx="1172" cy="1378" rx="84" ry="42" fill="#e6edf6" stroke="#cbd5e1"/>
    </g>
  `);
}

function sideMonitorCard(ui, accent = "#0b5cff") {
  const screenX = 210;
  const screenY = 238;
  const screenW = 1180;
  const screenH = 732;
  return base(`
    ${officeBackground(accent)}
    <g filter="url(#deviceShadow)" transform="rotate(-1 800 650)">
      ${rect(154, 174, 1292, 864, 40, "url(#deviceBezel)", "#111827", 'stroke-width="2"')}
      ${screenWithUi(screenX, screenY, screenW, screenH, ui, "screenClipObserve")}
      <rect x="744" y="1038" width="112" height="202" rx="24" fill="url(#stand)" stroke="#b8c3d1"/>
      <path d="M 574 1252 H 1026 Q 1082 1252 1114 1318 H 486 Q 518 1252 574 1252 Z" fill="url(#aluminum)" stroke="#b8c3d1"/>
    </g>
    <g opacity="0.88">
      <path d="M 180 1166 C 130 1078 178 980 272 980 C 358 980 410 1050 388 1130" fill="none" stroke="#172033" stroke-width="22" stroke-linecap="round"/>
      <rect x="156" y="1122" width="76" height="122" rx="32" fill="#182235"/>
      <rect x="338" y="1096" width="76" height="122" rx="32" fill="#182235"/>
    </g>
  `);
}

function keyboardRows(x, y, rows = 4, keyH = 25, keyW = 44, gap = 13) {
  let keys = "";
  for (let row = 0; row < rows; row++) {
    const rowOffset = row % 2 === 0 ? 0 : 24;
    for (let col = 0; col < 12; col++) {
      keys += rect(x + rowOffset + col * (keyW + gap), y + row * (keyH + gap), keyW, keyH, 7, "#f8fafc", "#c7d0dc", 'opacity="0.92"');
    }
  }
  return keys;
}

function base(content) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="room" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#f9fbff"/>
      <stop offset="48%" stop-color="#edf4ff"/>
      <stop offset="100%" stop-color="#f0fbf7"/>
    </linearGradient>
    <linearGradient id="desk" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#d8e3ee"/>
      <stop offset="48%" stop-color="#eef3f8"/>
      <stop offset="100%" stop-color="#c9d7e1"/>
    </linearGradient>
    <linearGradient id="deviceBezel" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="54%" stop-color="#0d1524"/>
      <stop offset="100%" stop-color="#273143"/>
    </linearGradient>
    <linearGradient id="aluminum" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#f9fafb"/>
      <stop offset="48%" stop-color="#dbe3ed"/>
      <stop offset="100%" stop-color="#aeb9c8"/>
    </linearGradient>
    <linearGradient id="stand" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#e8eef6"/>
      <stop offset="100%" stop-color="#aab6c5"/>
    </linearGradient>
    <linearGradient id="screenShine" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="42%" stop-color="#ffffff" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#b7d7ff" stop-opacity="0.18"/>
    </linearGradient>
    <filter id="softBlur" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="42"/>
    </filter>
    <filter id="deviceShadow" x="-15%" y="-15%" width="130%" height="140%">
      <feDropShadow dx="0" dy="42" stdDeviation="42" flood-color="#0f172a" flood-opacity="0.26"/>
    </filter>
    <filter id="bodyShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="28" stdDeviation="28" flood-color="#0f172a" flood-opacity="0.18"/>
    </filter>
  </defs>
  ${content}
</svg>`;
}

const cards = [
  ["workflow-configure-card.png", laptopCard(configureUi(), "#0b5cff")],
  ["workflow-simulate-card.png", monitorCard(simulateUi(), "#14b8a6")],
  ["workflow-observe-card.png", sideMonitorCard(observeUi(), "#0b5cff")]
];

const chrome = chromeCandidates.find((candidate) => {
  try {
    return execFileSync("powershell", ["-NoProfile", "-Command", `Test-Path '${candidate.replaceAll("'", "''")}'`], { encoding: "utf8" }).trim() === "True";
  } catch {
    return false;
  }
});

if (!chrome) {
  throw new Error("Chrome or Edge was not found for PNG rendering.");
}

const temp = mkdtempSync(join(tmpdir(), "relayclarity-workflow-"));
const userDataDir = join(temp, "profile");

try {
  for (const [filename, svg] of cards) {
    const svgPath = join(temp, filename.replace(".png", ".svg"));
    const outPath = resolve(root, "assets", filename);
    writeFileSync(svgPath, svg, "utf8");
    execFileSync(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--user-data-dir=${userDataDir}`,
      `--window-size=${width},${height}`,
      `--screenshot=${outPath}`,
      pathToFileURL(svgPath).href
    ], { stdio: "pipe" });
    console.log(`Generated ${outPath}`);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
