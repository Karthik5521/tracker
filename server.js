const express = require("express");
const fs = require("fs");
const app = express();

// 1x1 transparent GIF
const pixel = Buffer.from(
  "R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64"
);

// free IP→location lookup
async function getLocation(ip) {
  const fetch = (await import("node-fetch")).default;
  try {
    const resp = await fetch(`http://ip-api.com/json/${ip}`);
    return await resp.json();
  } catch {
    return { status: "fail" };
  }
}

// ✅ Root route
app.get("/", (req, res) => {
  res.send("📡 Mail Tracker server is running!");
});

// ✅ Test route
app.get("/test", (req, res) => {
  console.log("✅ /test endpoint hit");
  res.send("Hello from /test");
});

// 📩 Pixel route
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

// ✅ Use Render’s PORT (or 8080 locally)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ Tracker running on port ${PORT}`));
