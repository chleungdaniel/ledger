import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const artifactsDir = process.env.ARTIFACTS_DIR ?? "/opt/cursor/artifacts/screenshots";

const homeScreenHtml = (wallpaperClass: string) => `
<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; }
    .wall {
      padding: 56px 28px 40px;
      min-height: 220px;
    }
    .wall--light {
      background: linear-gradient(165deg, #d4dae8 0%, #eef1f8 45%, #f8f9fc 100%);
    }
    .wall--dark {
      background: linear-gradient(165deg, #0d0d0f 0%, #1a1a1e 50%, #2a2a30 100%);
    }
    .row {
      display: flex;
      gap: 22px;
      align-items: flex-end;
      justify-content: flex-start;
    }
    .app {
      width: 64px;
      text-align: center;
    }
    .app img, .ph {
      width: 60px;
      height: 60px;
      border-radius: 13.5px;
      display: block;
      margin: 0 auto;
    }
    .ph {
      background: rgba(120, 120, 128, 0.35);
    }
    .wall--dark .ph { background: rgba(255, 255, 255, 0.18); }
    .label {
      margin-top: 5px;
      font-size: 11px;
      line-height: 1.2;
      letter-spacing: -0.02em;
    }
    .wall--light .label { color: #1c1c1e; }
    .wall--dark .label { color: #f2f2f7; }
  </style>
</head>
<body>
  <div class="wall ${wallpaperClass}">
    <div class="row">
      <div class="app">
        <div class="ph" aria-hidden="true"></div>
        <div class="label">日曆</div>
      </div>
      <div class="app">
        <img src="./apple-touch-icon.png" width="60" height="60" alt="記帳" />
        <div class="label">記帳</div>
      </div>
      <div class="app">
        <div class="ph" aria-hidden="true"></div>
        <div class="label">相機</div>
      </div>
      <div class="app">
        <div class="ph" aria-hidden="true"></div>
        <div class="label">設定</div>
      </div>
    </div>
  </div>
</body>
</html>
`;

test("premium app icon previews", async ({ page, baseURL }) => {
  const iconUrl = `${baseURL}icons/icon-512.png`;
  const publicDir = path.join(process.cwd(), "public");
  const icon512B64 = readFileSync(path.join(publicDir, "icons/icon-512.png")).toString(
    "base64",
  );
  const touchB64 = readFileSync(path.join(publicDir, "apple-touch-icon.png")).toString(
    "base64",
  );
  const touchData = `data:image/png;base64,${touchB64}`;

  await page.goto(iconUrl);
  await page.screenshot({
    path: path.join(artifactsDir, "v6-icon-512-preview.png"),
  });

  await page.goto("about:blank");
  await page.setContent(
    `<!doctype html><html><head><meta charset="UTF-8"/><style>
      body{margin:0;background:#1a1d21;display:flex;align-items:center;justify-content:center;min-height:100vh}
      img{width:512px;height:512px;border-radius:112px;box-shadow:0 24px 80px rgba(0,0,0,.45)}
    </style></head><body><img src="data:image/png;base64,${icon512B64}" alt="記帳 icon" /></body></html>`,
    { waitUntil: "commit" },
  );
  await expect(page.locator("img")).toBeVisible();
  await page.screenshot({
    path: path.join(artifactsDir, "v6-icon-large-hero.png"),
    fullPage: true,
  });

  const lightHtml = homeScreenHtml("wall--light").replace(
    "./apple-touch-icon.png",
    touchData,
  );
  await page.setContent(lightHtml, { waitUntil: "commit" });
  await expect(page.locator('img[alt="記帳"]')).toBeVisible();
  await page.screenshot({
    path: path.join(artifactsDir, "v6-icon-homescreen-light.png"),
    fullPage: true,
  });

  const darkHtml = homeScreenHtml("wall--dark").replace(
    "./apple-touch-icon.png",
    touchData,
  );
  await page.setContent(darkHtml, { waitUntil: "commit" });
  await page.screenshot({
    path: path.join(artifactsDir, "v6-icon-homescreen-dark.png"),
    fullPage: true,
  });
});
