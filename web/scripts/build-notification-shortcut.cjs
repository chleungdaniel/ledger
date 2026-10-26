/**
 * Builds the installable iOS Shortcut for notification → ledger inbox deep link.
 * Run: npm run shortcuts:build
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  actionOutput,
  buildShortcut,
  withVariables,
} = require("@joshfarrant/shortcuts-js");
const {
  comment,
  getTextFromInput,
  openURLs,
  text,
  URLEncode,
} = require("@joshfarrant/shortcuts-js/actions");

const OUT_DIR = path.join(__dirname, "../public/shortcuts");
const OUT_FILE = path.join(OUT_DIR, "ledger-notification-import.shortcut");

const encoded = actionOutput();
const actions = [
  comment({
    text:
      "由記帳 PWA 產生。請在「收到通知時」個人自動化中執行此捷徑，並傳入「通知內文」。",
  }),
  getTextFromInput(undefined, actionOutput()),
  URLEncode({ encodeMode: "Encode" }, encoded),
  text({
    text: withVariables`https://chleungdaniel.github.io/ledger/?add=1&text=${encoded}&type=expense`,
  }),
  openURLs(),
];

fs.mkdirSync(OUT_DIR, { recursive: true });
const raw = buildShortcut(actions);
fs.writeFileSync(OUT_FILE, raw);
const patch = spawnSync(
  "python3",
  [path.join(__dirname, "patch-notification-shortcut.py"), OUT_FILE],
  { stdio: "inherit" },
);
if (patch.status !== 0) {
  process.exit(patch.status ?? 1);
}
const stat = fs.statSync(OUT_FILE);
console.log(`Wrote ${OUT_FILE} (${stat.size} bytes)`);
