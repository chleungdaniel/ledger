import { isLikelyPayMeOcrText, parsePayMeOcrText } from "./parsePayMeOcr";
import { parseWalletOcrText } from "./parseWalletOcr";
import type { ImportCandidate } from "./types";

export function parseScreenshotOcrText(
  text: string,
  refDate = new Date(),
): ImportCandidate[] {
  if (isLikelyPayMeOcrText(text)) {
    return parsePayMeOcrText(text, refDate);
  }
  return parseWalletOcrText(text, refDate);
}
