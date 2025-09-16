const express = require("express");
const fs = require("fs");
const app = express();

// Let Express trust Render's proxy for real IPs
app.set("trust proxy", true);

// 1x1 transparent GIF (tracking pixel)
const pixel = Buffer.from(
  "R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64"
);

// 🌍 Free IP → location lookup
async function getLocation(ip) {
  const fetch = (await import("node-fetch")).default;
  try {
    const firstIp = ip.split(",")[0].trim(); // handle multiple IPs
    const resp = await fetch(`https://ipwhois.app/json/${firstIp}`);
    return await resp.json();
  } catch (err) {
    console.error("❌ Geo lookup failed:", err);
    return { status: "fail" };
  }
}

// ✅ Test route
app.get("/test", (req, res) => {
  console.log("✅ /test endpoint hit");
  res.send("Hello from /test");
});

// 📩 Tracking pixel route
app.get("/pixel", async (req, res) => {
  console.log("🚀 /pixel endpoint was called");

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

  // Log
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
