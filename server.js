const express = require("express");
const fs = require("fs");
const app = express();

app.set("trust proxy", true);

// 1×1 transparent GIF (tracking pixel)
const pixel = Buffer.from(
  "R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64"
);

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// 🌍 IP → location lookup (using ipwhois.app)
async function getLocation(ip) {
  const fetch = (await import("node-fetch")).default;
  try {
    const firstIp = String(ip || "").split(",")[0].trim();
    if (!firstIp) return { status: "fail" };
    const resp = await fetch(`https://ipwhois.app/json/${firstIp}`);
    return await resp.json();
  } catch (err) {
    console.error("❌ Geo lookup failed:", err);
    return { status: "fail" };
  }
}

// 📊 Dashboard
app.get("/", (req, res) => {
  let logs = [];
  try {
    if (fs.existsSync("opens.log")) {
      const lines = fs.readFileSync("opens.log", "utf8").trim().split("\n");
      logs = lines.filter(Boolean).map((l) => JSON.parse(l));
    }
  } catch (err) {
    console.error("❌ Error reading opens.log:", err);
  }

  logs.sort((a, b) => new Date(b.time) - new Date(a.time));

  const rows = logs
    .map((e) => {
      const city = e.location?.city || "?";
      const country = e.location?.country || "?";
      const isp = e.location?.isp || e.location?.org || "?";
      const proxy = e.proxy || "-";
      return `
        <tr>
          <td>${esc(e.id)}</td>
          <td>${esc(e.recipient || "-")}</td>
          <td>${esc(e.subject || "-")}</td>
          <td class="mono">${esc(e.ip)}</td>
          <td>${esc(city)}, ${esc(country)}</td>
          <td>${esc(isp)}</td>
          <td>${esc(proxy)}</td>
          <td class="ua">${esc(e.ua)}</td>
          <td class="mono">${esc(e.time)}</td>
        </tr>
      `;
    })
    .join("");

  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Email Tracker Dashboard</title>
  <meta http-equiv="refresh" content="10" />
  <style>
    :root { color-scheme: light dark; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 24px; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .sub { color: #666; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; background: rgba(0,0,0,0.02); }
    th, td { padding: 10px; border-bottom: 1px solid #ddd; vertical-align: top; }
    th { text-align: left; background: #111; color: #fff; position: sticky; top: 0; }
    tr:nth-child(even) td { background: rgba(0,0,0,0.03); }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    .ua { max-width: 380px; overflow-wrap: anywhere; }
    .pill { display:inline-block; padding:2px 8px; border-radius:999px; background:#eef; color:#225; font-size:12px; }
    .bar { display:flex; gap:12px; align-items:center; margin: 8px 0 18px; }
    .note { font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>📊 Email Tracker Report</h1>
  <div class="bar">
    <div class="pill">Total opens: ${logs.length}</div>
    <div class="note">Auto-refreshes every 10s • Data resets on free hosting restarts</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Recipient</th>
        <th>Subject</th>
        <th>IP</th>
        <th>Geolocation</th>
        <th>ISP</th>
        <th>Proxy</th>
        <th>User-Agent</th>
        <th>Time (UTC)</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="9">No opens yet. Send an email with <code>&lt;img src=".../pixel?id=..."&gt;</code> and open it.</td></tr>`}
    </tbody>
  </table>
</body>
</html>`);
});

// 📩 Tracking pixel
app.get("/pixel", async (req, res) => {
  const id = req.query.id || "unknown";
  const recipient = req.query.recipient || "unknown";
  const subject = req.query.subject || "unknown";

  const ip =
    req.headers["x-forwarded-for"] ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown";

  const ua = req.get("user-agent") || "unknown";

  // detect Gmail proxy
  const proxy = ua.includes("GoogleImageProxy") ? "Gmail Proxy" : "Direct";

  const geo = await getLocation(ip);

  const entry = {
    id,
    recipient,
    subject,
    ip,
    location: geo,
    isp: geo.isp || geo.org || "?",
    ua,
    proxy,
    time: new Date().toISOString()
  };

  console.log("📩 Open logged:\n", JSON.stringify(entry, null, 2));
  try {
    fs.appendFileSync("opens.log", JSON.stringify(entry) + "\n");
  } catch (err) {
    console.error("❌ Error writing to opens.log:", err);
  }

  res.set("Content-Type", "image/gif");
  res.set("Cache-Control", "no-store");
  res.end(pixel);
});

app.get("/test", (_req, res) => res.send("Hello from /test"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Tracker running on port ${PORT}`);
});
