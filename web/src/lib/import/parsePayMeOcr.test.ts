import { describe, expect, it } from "vitest";
import {
  isLikelyPayMeOcrText,
  PAYME_OCR_FIXTURE,
  parsePayMeOcrText,
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
  it("parses only minus rows as expenses with dates and notes", () => {
    const rows = parsePayMeOcrText(PAYME_OCR_FIXTURE, REF);
    expect(rows).toHaveLength(3);

    const taobao = rows.find((r) => r.merchant === "TAOBAO");
    expect(taobao?.amount).toBe(355.3);
    expect(taobao?.type).toBe("expense");
    expect(taobao?.note).toBe("TAOBAO");
    expect(new Date(taobao!.date).getDate()).toBe(10);
    expect(new Date(taobao!.date).getMonth()).toBe(9);

    const billy = rows.find((r) => r.merchant === "Billy Billy");
    expect(billy?.amount).toBe(371);
    expect(billy?.note).toBe("dinner");
    expect(new Date(billy!.date).getDate()).toBe(9);

    const regina = rows.find((r) => r.merchant === "Regina So");
    expect(regina?.amount).toBe(258);
    expect(regina?.note).toBe("Regina So");

    expect(rows.every((r) => r.type === "expense")).toBe(true);
    expect(rows.some((r) => r.merchant === "增值")).toBe(false);
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
