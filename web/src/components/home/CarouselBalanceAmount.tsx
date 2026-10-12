import { useCallback, useLayoutEffect, useRef } from "react";
import { shrinkFontSizeToFit } from "../../lib/carouselBalanceFormat";

interface CarouselBalanceAmountProps {
  text: string;
  testId: string;
}

export function CarouselBalanceAmount({ text, testId }: CarouselBalanceAmountProps) {
  const fitRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  const fitText = useCallback(() => {
    const fitEl = fitRef.current;
    const textEl = textRef.current;
    if (!fitEl || !textEl) return;

    const maxWidth = fitEl.clientWidth;
    if (maxWidth <= 0) return;

    textEl.style.transform = "";

    const measure = (fontSizePx: number) => {
      textEl.style.fontSize = `${fontSizePx}px`;
      textEl.style.transform = "";
      return textEl.scrollWidth;
    };

    const fontSize = shrinkFontSizeToFit(measure, maxWidth, 22, 6);
    textEl.style.fontSize = `${fontSize}px`;
    if (textEl.scrollWidth > maxWidth) {
      const scale = maxWidth / textEl.scrollWidth;
      textEl.style.transform = `scale(${scale})`;
      textEl.style.transformOrigin = "center";
    }
  }, [text]);

  useLayoutEffect(() => {
    fitText();
  }, [fitText]);

  useLayoutEffect(() => {
    const fitEl = fitRef.current;
    const donutWrap = fitEl?.closest(".hk-chart__donut-wrap") as HTMLElement | null;
    if (!donutWrap || !fitEl) return;
    const observer = new ResizeObserver(() => fitText());
    observer.observe(donutWrap);
    observer.observe(fitEl);
    return () => observer.disconnect();
  }, [fitText]);

  return (
    <div ref={fitRef} className="hk-chart__balance-fit">
      <p
        ref={textRef}
        className="hk-chart__balance-value tabular"
        data-testid={testId}
      >
        {text}
      </p>
    </div>
  );
}
