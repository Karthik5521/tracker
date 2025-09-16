const express = require("express");
const fs = require("fs");
const app = express();

// 1x1 transparent GIF
const pixel = Buffer.from(
  "R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64"
);

// 🌍 IP → location lookup
async function getLocation(ip) {
  const fetch = (await import("node-fetch")).default;
  try {
    const firstIp = ip.split(",")[0].trim();
    const resp = await fetch(`https://ipapi.co/${firstIp}/json/`);
    return await resp.json();
  } catch {
    return { status: "fail" };
  }
}

// 📊 Dashboard
app.get("/", (req, res) => {
  let logs = [];
  try {
    if (fs.existsSync("opens.log")) {
      const lines = fs.readFileSync("opens.log", "utf-8").trim().split("\n");
      logs = lines.map((line) => JSON.parse(line));
    }
  } catch (err) {
    console.error("❌ Error reading opens.log:", err);
  }

  let html = `
    <html>
    <head>
      <title>Email Tracker Dashboard</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f4f4f9; }
        h1 { color: #333; }
        .summary { margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; background: white; box-shadow: 0 0 5px rgba(0,0,0,0.1); }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 14px; }
        th { background: #333; color: white; text-align: left; }
        tr:nth-child(even) { background: #f9f9f9; }
        .ip { font-family: monospace; }
      </style>
    </head>
    <body>
      <h1>📊 Email Tracker Report</h1>
      <div class="summary">
        <strong>Total Opens:</strong> ${logs.length}
      </div>
      <table>
        <tr>
          <th>ID</th>
          <th>IP Address</th>
          <th>Geolocation</th>
          <th>ISP</th>
          <th>User-Agent</th>
          <th>Time</th>
        </tr>`;

  logs.forEach((entry) => {
    html += `
      <tr>
        <td>${entry.id}</td>
        <td class="ip">${entry.ip}</td>
        <td>${entry.location?.city || "?"}, ${entry.location?.country_name || "?"}</td>
        <td>${entry.location?.org || "?"}</td>
        <td>${entry.ua}</td>
        <td>${entry.time}</td>
      </tr>`;
  });

  html += `
      </table>
    </body>
    </html>
  `;

  res.send(html);
});

// 📩 Tracking pixel route
app.get("/pixel", async (req, res) => {
  const id = req.query.id || "unknown";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const ua = req.get("user-agent");
  const geo = await getLocation(ip);

  const entry = {
    id,
    ip,
    location: geo,
    ua,
    time: new Date().toISOString()
  };

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

// 🚀 Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`✅ Tracker running at http://localhost:${PORT}`)
);
