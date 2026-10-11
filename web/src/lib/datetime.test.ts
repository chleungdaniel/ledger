import { describe, expect, it } from "vitest";
import {
  formatDeepLinkDebug,
  isoToLocalDateTimeInput,
  localDateTimeInputValue,
  parseLocalDateTimeInput,
  parseLocalDateTimeInputToIso,
  parseShortcutDateParam,
} from "./datetime";

describe("datetime (Asia/Hong_Kong)", () => {
  it("keeps 21:21 local in datetime-local when TZ is Hong Kong", () => {
    const instant = new Date("2026-10-10T13:21:00.000Z");
    expect(localDateTimeInputValue(instant)).toBe("2026-10-10T21:21");
    expect(isoToLocalDateTimeInput(instant.toISOString())).toBe("2026-10-10T21:21");
  });

  it("round-trips local datetime-local input", () => {
    const input = "2026-10-10T21:21";
    const parsed = parseLocalDateTimeInput(input);
    expect(localDateTimeInputValue(parsed)).toBe(input);
    const iso = parseLocalDateTimeInputToIso(input);
    expect(isoToLocalDateTimeInput(iso)).toBe(input);
  });

  it("parses shortcut date without timezone as local", () => {
    const d = parseShortcutDateParam("2026-10-10T21:21")!;
    expect(localDateTimeInputValue(d)).toBe("2026-10-10T21:21");
  });

  it("parses ISO Z as instant", () => {
    const d = parseShortcutDateParam("2026-10-10T13:21:00.000Z")!;
    expect(localDateTimeInputValue(d)).toBe("2026-10-10T21:21");
  });

  it("formats deeplink debug with href and empty merchant", () => {
    const text = formatDeepLinkDebug(
      "https://example.com/ledger/?add=1&merchant=&auto=1",
      "?add=1&merchant=&auto=1",
    );
    expect(text).toContain("https://example.com/ledger/");
    expect(text).toContain("merchant: (empty)");
  });
});
