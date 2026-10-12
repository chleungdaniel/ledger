import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  CAROUSEL_OFFSET_AMOUNT_Y,
  CAROUSEL_OFFSET_LABEL_Y,
  CAROUSEL_OFFSET_NOTE_LINE1_Y,
  CAROUSEL_OFFSET_NOTE_LINE2_Y,
  maxCenterTextWidthPx,
  measureDonutScreenGeometry,
  type DonutScreenGeometry,
} from "../../lib/carouselDonutGeometry";
import { CarouselFittedSvgNote, CarouselFittedSvgText } from "./CarouselFittedSvgText";

interface CarouselDonutCenterProps {
  balanceLabel: string;
  balanceText: string;
  openingNoteLine1?: string | null;
  openingNoteLine2?: string | null;
  hideAmounts: boolean;
  onToggleHide: () => void;
  eyeTestId: string;
  balanceTestId: string;
  openingNoteTestId?: string;
}

export function CarouselDonutCenter({
  balanceLabel,
  balanceText,
  openingNoteLine1,
  openingNoteLine2,
  hideAmounts,
  onToggleHide,
  eyeTestId,
  balanceTestId,
  openingNoteTestId,
}: CarouselDonutCenterProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [geom, setGeom] = useState<DonutScreenGeometry | null>(null);
  const [amountMaxW, setAmountMaxW] = useState(72);
  const [noteMaxW, setNoteMaxW] = useState(64);

  const remeasure = useCallback(() => {
    const run = async () => {
      const root = rootRef.current;
      const wrap = root?.closest(".hk-chart__donut-wrap") as HTMLElement | null;
      if (!wrap) return;

      if (typeof document !== "undefined" && document.fonts?.ready) {
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

      setGeom(measured);
      setAmountMaxW(
        maxCenterTextWidthPx(measured.innerRadiusPx, CAROUSEL_OFFSET_AMOUNT_Y),
      );

      const noteOffset =
        (CAROUSEL_OFFSET_NOTE_LINE1_Y + CAROUSEL_OFFSET_NOTE_LINE2_Y) / 2;
      setNoteMaxW(maxCenterTextWidthPx(measured.innerRadiusPx, noteOffset));
    };
    void run();
  }, []);

  useLayoutEffect(() => {
    void remeasure();
  }, [remeasure, balanceText, openingNoteLine1, openingNoteLine2, hideAmounts]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const wrap = root?.closest(".hk-chart__donut-wrap") as HTMLElement | null;
    if (!wrap) return;

    const observer = new ResizeObserver(() => {
      void remeasure();
    });
    observer.observe(wrap);
    const surface = wrap.querySelector(".recharts-surface");
    if (surface) observer.observe(surface);

    return () => observer.disconnect();
  }, [remeasure]);

  const labelMaxW =
    geom != null
      ? maxCenterTextWidthPx(geom.innerRadiusPx, CAROUSEL_OFFSET_LABEL_Y)
      : 0;

  const showOpening =
    openingNoteLine1 &&
    openingNoteLine2 &&
    !hideAmounts &&
    openingNoteTestId;

  return (
    <div
      ref={rootRef}
      className="hk-chart__center"
      data-donut-inner-radius-px={geom?.innerRadiusPx?.toFixed(2) ?? ""}
    >
      <span className="hk-chart__coin" aria-hidden>🪙</span>
      <button
        type="button"
        className="hk-chart__balance-label"
        data-testid={eyeTestId}
        style={{ maxWidth: labelMaxW > 0 ? `${labelMaxW}px` : undefined }}
        onClick={onToggleHide}
      >
        {balanceLabel} 👁
      </button>
      <CarouselFittedSvgText
        text={balanceText}
        maxWidthPx={amountMaxW}
        viewHeight={88}
        fontSizeUnits={52}
        fontWeight={800}
        testId={balanceTestId}
      />
      {showOpening && (
        <CarouselFittedSvgNote
          line1={openingNoteLine1}
          line2={openingNoteLine2}
          maxWidthPx={noteMaxW}
          testId={openingNoteTestId}
        />
      )}
      {openingNoteLine1 && hideAmounts && openingNoteTestId && (
        <CarouselFittedSvgNote
          line1="含期初結餘"
          line2="••••"
          maxWidthPx={noteMaxW}
          testId={openingNoteTestId}
        />
      )}
    </div>
  );
}
