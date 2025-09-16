// content.js

// Run after Gmail compose window is ready
function injectPixel() {
  // 1. Find Gmail fields
  const toField = document.querySelector("textarea[name=to], input[name=to]");
  const subjectField = document.querySelector("input[name=subjectbox]");

  if (!toField || !subjectField) {
    console.log("⚠️ Could not find Gmail fields yet.");
    return;
  }

  const recipient = encodeURIComponent(toField.value || "unknown");
  const subject = encodeURIComponent(subjectField.value || "unknown");

  // 2. Create tracking pixel
  const pixelUrl = `https://tracker-j4vk.onrender.com/pixel?id=${Date.now()}&recipient=${recipient}&subject=${subject}`;
  const img = document.createElement("img");
  img.src = pixelUrl;
  img.width = 1;
  img.height = 1;
  img.style.display = "none";

  // 3. Insert into email body
  const bodyArea = document.querySelector("[aria-label='Message Body']");
  if (bodyArea) {
    bodyArea.appendChild(img);
    console.log("✅ Tracking pixel injected:", pixelUrl);
  } else {
    console.log("⚠️ Could not find Gmail body to inject pixel.");
  }
}

// Hook Gmail send button
document.addEventListener("click", (e) => {
  const sendBtn = e.target.closest("div[role='button'][data-tooltip*='Send']");
  if (sendBtn) {
    setTimeout(injectPixel, 500); // wait for Gmail to process before injection
  }
});
