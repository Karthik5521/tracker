const express = require("express");
const fs = require("fs");
const app = express();

app.set("trust proxy", true);

// 1×1 transparent GIF (tracking pixel)
const pixel = Buffer.from(
  "R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64"
);

// HTML escaper
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// 🌍 IP → location lookup
async function getLocation(ip) {
  const fetch = (await import("node-fetch")).default;
  try {
    const firstIp = String(ip || "").split(",")[0].trim();
    if (!firstIp) return { status: "fail" };
    const resp = await fetch(`https://ipapi.co/${firstIp}/json/`);
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
      const city =
        e.location?.city || e.location?.timezone || e.location?.region || "?";
      const country =
        e.location?.country_name || e.location?.country || "?";
      const isp = e.location?.org || e.location?.asn || "?";

      // Format time nicely
      const utc = new Date(e.time).toUTCString();
      const local = new Date(e.time).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZoneName: "short"
      });

      return `
        <tr>
          <td>${esc(e.id)}</td>
          <td>${esc(e.recipient || "-")}</td>
          <td>${esc(e.subject || "-")}</td>
          <td class="mono">${esc(e.ip)}</td>
          <td>${esc(city)}, ${esc(country)}</td>
          <td>${esc(isp)}</td>
          <td class="ua">${esc(e.ua)}</td>
          <td>
            <div><b>Local:</b> ${esc(local)}</div>
            <div><b>UTC:</b> ${esc(utc)}</div>
          </td>
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
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 24px; }
    h1 { margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; border-bottom: 1px solid #ddd; vertical-align: top; }
    th { background: #111; color: #fff; }
    tr:nth-child(even) td { background: #f9f9f9; }
    .mono { font-family: monospace; font-size: 12px; }
    .ua { max-width: 380px; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <h1>📊 Email Tracker Report</h1>
  <p>Total opens: ${logs.length}</p>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Recipient</th>
        <th>Subject</th>
        <th>IP</th>
        <th>Geolocation</th>
        <th>ISP</th>
        <th>User-Agent</th>
        <th>Time</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="8">No opens yet. Send a mail with <code>&lt;img src=".../pixel?id=..."&gt;</code> and open it.</td></tr>`}
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
  const geo = await getLocation(ip);

  const entry = { id, recipient, subject, ip, location: geo, ua, time: new Date().toISOString() };

  console.log("📩 Open logged:", entry);
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
app.listen(PORT, () => console.log(`✅ Tracker running on port ${PORT}`));
