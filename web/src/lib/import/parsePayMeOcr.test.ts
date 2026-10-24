import { describe, expect, it } from "vitest";
import {
  isLikelyPayMeOcrText,
  PAYME_OCR_FIXTURE,
  parsePayMeOcrText,
  payMeIncomeRowsToSkip,
  scanSignedRows,
} from "./parsePayMeOcr";
import { WALLET_OCR_FIXTURE } from "./parseWalletOcr";

const REF = new Date("2026-10-12T12:00:00.000Z");

describe("isLikelyPayMeOcrText", () => {
  it("detects PayMe layout", () => {
    expect(isLikelyPayMeOcrText(PAYME_OCR_FIXTURE)).toBe(true);
    expect(isLikelyPayMeOcrText(WALLET_OCR_FIXTURE)).toBe(false);
  });
});

describe("parsePayMeOcrText", () => {
  it("parses expenses, paired income skip, and unpaired income", () => {
    const rows = parsePayMeOcrText(PAYME_OCR_FIXTURE, REF);
    expect(rows.filter((r) => r.type === "expense")).toHaveLength(3);
    expect(rows.filter((r) => r.type === "income")).toHaveLength(1);

    const taobao = rows.find((r) => r.merchant === "TAOBAO");
    expect(taobao?.amount).toBe(355.3);
    expect(taobao?.type).toBe("expense");
    expect(taobao?.note).toBe("TAOBAO");
    expect(new Date(taobao!.date).getDate()).toBe(10);

    const billy = rows.find((r) => r.merchant === "Billy Billy");
    expect(billy?.amount).toBe(371);
    expect(billy?.note).toBe("dinner");
    expect(new Date(billy!.date).getDate()).toBe(9);

    const regina = rows.find((r) => r.merchant === "Regina So");
    expect(regina?.amount).toBe(258);
    expect(regina?.note).toBe("Regina So");

    const topUp = rows.find((r) => r.type === "income");
    expect(topUp?.merchant).toBe("增值");
    expect(topUp?.amount).toBe(354.3);
    expect(topUp?.note).toContain("恒生銀行");
    expect(new Date(topUp!.date).getDate()).toBe(10);

    const paired371 = rows.filter((r) => r.amount === 371);
    expect(paired371).toHaveLength(1);
    expect(paired371[0].type).toBe("expense");
  });

  it("pairs plus with minus on same date first", () => {
    const lines = PAYME_OCR_FIXTURE.split(/\r?\n/).map((l) => l.trim());
    const scanned = scanSignedRows(lines, REF);
    const skip = payMeIncomeRowsToSkip(scanned);
    const incomes = scanned.filter((r) => r.sign === "income");
    expect(incomes).toHaveLength(2);
    const skipped = incomes.filter((r) => skip.has(r.rowId));
    expect(skipped).toHaveLength(1);
    expect(skipped[0].amount).toBe(371);
  });

  it("keeps separate dates for each PayMe section header", () => {
    const text = `
2026年10月21日
lunch
- 71.00
2026年10月18日
- 239.00
2026年10月15日
lunch
- 71.00
`.trim();
    const rows = parsePayMeOcrText(text, REF);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => new Date(r.date).getDate()).sort((a, b) => a - b)).toEqual([15, 18, 21]);
  });

  it("tolerates minus and amount spacing variants", () => {
    const variant = `
2026年10月10日
SHOP
note
-355.30
`.trim();
    const rows = parsePayMeOcrText(variant, REF);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(355.3);
    expect(rows[0].merchant).toBe("SHOP");
  });
});
