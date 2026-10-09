import { newId } from "../format";
import { hkdFromForeign, loadFxRates } from "./fxSettings";
import { isLikelyDateLine, resolveWalletDate } from "./parseDates";
import type { ImportCandidate } from "./types";

const SKIP_LINE =
  /^(最新交易|交易|全部|篩選|搜尋|完成|取消|HK\$|NT\$|USD|Apple Pay|Google Pay)$/i;

const AMOUNT_TAIL =
  /(?:^|\s)(\+?)\s*(HK\$|NT\$|US\$|USD)?\s*([\d,]+(?:\.\d{1,2})?)\s*$/i;

const JOURNEY = /旅程中/;

export function parseWalletOcrText(text: string, refDate = new Date()): ImportCandidate[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const candidates: ImportCandidate[] = [];
  const rates = loadFxRates();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (SKIP_LINE.test(line) || JOURNEY.test(line)) continue;

    const amountMatch = line.match(AMOUNT_TAIL);
    if (!amountMatch) continue;

    const sign = amountMatch[1] === "+" ? "income" : "expense";
    const currencyToken = (amountMatch[2] ?? "HK$").replace("$", "");
    const currency =
      currencyToken === "NT"
        ? "TWD"
        : currencyToken === "US"
          ? "USD"
          : currencyToken || "HKD";
    const rawAmount = Number(amountMatch[3].replace(/,/g, ""));
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) continue;

    const contextStart = Math.max(0, i - 4);
    const context = lines.slice(contextStart, i);
    let dateLine = "";
    let merchant = "";
    const meta: string[] = [];

    for (const ctx of context) {
      if (isLikelyDateLine(ctx)) {
        dateLine = ctx;
      } else if (!SKIP_LINE.test(ctx) && !AMOUNT_TAIL.test(ctx)) {
        if (!merchant) merchant = ctx;
        else meta.push(ctx);
      }
    }

    if (!merchant) {
      merchant = line.replace(AMOUNT_TAIL, "").trim() || "未知商家";
    }

    const resolved = dateLine ? resolveWalletDate(dateLine, refDate) : refDate;
    const dateIso = (resolved ?? refDate).toISOString();

    let amount = rawAmount;
    let originalAmount: number | undefined;
    let originalCurrency: string | undefined;
    let note = merchant;
    if (meta.length) note = `${merchant} · ${meta.join(" · ")}`;

    if (currency !== "HKD") {
      originalAmount = rawAmount;
      originalCurrency = currency;
      amount = hkdFromForeign(rawAmount, currency, rates);
      note = `${note}（${currency} ${rawAmount}）`;
    }

    if (sign === "income" && /退款|調整/.test(line + meta.join(" "))) {
      note = `${note} · 退款`;
    }

    candidates.push({
      id: newId(),
      merchant,
      amount,
      currency: "HKD",
      originalAmount,
      originalCurrency,
      type: sign,
      date: dateIso,
      note,
      categoryId: null,
      selected: true,
      isDuplicate: false,
    });
  }

  return candidates;
}

/** Bundled fixtures mirroring Wallet / Octopus OCR output. */
export const WALLET_OCR_FIXTURE = `
最新交易
燒肉 Like
香港灣仔
星期二
HK$261.80
Five Guys
Apple Pay
昨日
HK$89.00
Uber
香港
30分鐘前
HK$45.50
Fusion by PARKnSHOP
香港
26/9/2026
HK$120.00
台北 minimelts
NT$147.00
`.trim();

export const OCTOPUS_OCR_FIXTURE = `
八達通
鐵路
新界太和
巴士
HK$7.90
鐵路
車資調整 - 巴士
+HK$4.30
巴士
旺角
旅程中
`.trim();
