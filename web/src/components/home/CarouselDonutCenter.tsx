import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  computeCarouselAmountFontSizePx,
  splitCarouselBalance,
} from "../../lib/carouselBalanceFormat";
import {
  CAROUSEL_OFFSET_AMOUNT_Y,
  CAROUSEL_OFFSET_LABEL_Y,
  maxCenterTextWidthPx,
  measureDonutScreenGeometry,
} from "../../lib/carouselDonutGeometry";

interface CarouselDonutCenterProps {
  balanceLabel: string;
  balanceAmount: number;
  hideAmounts: boolean;
  onToggleHide: () => void;
  eyeTestId: string;
  balanceTestId: string;
}

export function CarouselDonutCenter({
  balanceLabel,
  balanceAmount,
  hideAmounts,
  onToggleHide,
  eyeTestId,
  balanceTestId,
}: CarouselDonutCenterProps) {
  const amountRef = useRef<HTMLParagraphElement>(null);
  const [fontSizePx, setFontSizePx] = useState(22);
  const [labelMaxW, setLabelMaxW] = useState<number | undefined>(undefined);

  const parts = hideAmounts ? null : splitCarouselBalance(balanceAmount);

  const remeasure = useCallback(() => {
    const split = hideAmounts ? null : splitCarouselBalance(balanceAmount);
    const run = async () => {
      const amountEl = amountRef.current;
      const wrap = amountEl?.closest(".hk-chart__donut-wrap") as HTMLElement | null;
      if (!wrap || !amountEl) return;

      if (document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {
          /* ignore */
        }
      }

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const measured = measureDonutScreenGeometry(wrap);
      if (!measured) return;

      const avail = maxCenterTextWidthPx(
        measured.innerRadiusPx,
        CAROUSEL_OFFSET_AMOUNT_Y,
      );
      setLabelMaxW(
        maxCenterTextWidthPx(measured.innerRadiusPx, CAROUSEL_OFFSET_LABEL_Y),
      );

      if (hideAmounts || !split) {
        setFontSizePx(22);
        return;
      }

      let size = computeCarouselAmountFontSizePx(avail, split.charCount);
      amountEl.style.fontSize = `${size}px`;
      while (size > 15 && amountEl.scrollWidth > avail + 1) {
        size -= 0.5;
        amountEl.style.fontSize = `${size}px`;
      }
      setFontSizePx(size);
    };
    void run();
  }, [balanceAmount, hideAmounts]);

  useLayoutEffect(() => {
    remeasure();
  }, [remeasure]);

  useLayoutEffect(() => {
    const amountEl = amountRef.current;
    const wrap = amountEl?.closest(".hk-chart__donut-wrap") as HTMLElement | null;
    if (!wrap) return;

    const observer = new ResizeObserver(() => remeasure());
    observer.observe(wrap);
    const surface = wrap.querySelector(".recharts-surface");
    if (surface) observer.observe(surface);
    return () => observer.disconnect();
  }, [remeasure]);

  return (
    <div className="hk-chart__center">
      <button
        type="button"
        className="hk-chart__balance-label"
        data-testid={eyeTestId}
        style={labelMaxW != null ? { maxWidth: `${labelMaxW}px` } : undefined}
        onClick={onToggleHide}
      >
        {balanceLabel} 👁
      </button>
      <p
        ref={amountRef}
        className="hk-chart__balance-value tabular"
        data-testid={balanceTestId}
        data-font-size-px={fontSizePx.toFixed(1)}
        style={{ fontSize: `${fontSizePx}px` }}
      >
        {hideAmounts ? (
          "••••"
        ) : (
          <>
            {parts!.main}
            <small className="hk-chart__balance-decimals">.{parts!.decimals}</small>
          </>
        )}
      </p>
    </div>
  );
}
