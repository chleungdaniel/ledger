const VIEW_W = 1000;

const SVG_TEXT_STYLE = {
  fontFamily:
    'system-ui, -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif',
  fontVariantNumeric: "tabular-nums",
} as const;

interface CarouselFittedSvgTextProps {
  text: string;
  maxWidthPx: number;
  viewHeight: number;
  fontSizeUnits: number;
  fontWeight?: number;
  testId?: string;
  className?: string;
}

export function CarouselFittedSvgText({
  text,
  maxWidthPx,
  viewHeight,
  fontSizeUnits,
  fontWeight = 800,
  testId,
  className,
}: CarouselFittedSvgTextProps) {
  if (maxWidthPx <= 0) return null;

  const heightPx = Math.max(12, maxWidthPx * (viewHeight / VIEW_W));

  return (
    <svg
      className={className ?? "hk-chart__fitted-svg"}
      width={maxWidthPx}
      height={heightPx}
      viewBox={`0 0 ${VIEW_W} ${viewHeight}`}
      preserveAspectRatio="xMidYMid meet"
      data-testid={testId}
      aria-hidden={testId ? undefined : true}
      role={testId ? "img" : undefined}
      aria-label={testId ? text : undefined}
    >
      <text
        x={VIEW_W / 2}
        y={viewHeight * 0.62}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSizeUnits}
        fontWeight={fontWeight}
        lengthAdjust="spacingAndGlyphs"
        textLength={VIEW_W * 0.96}
        style={SVG_TEXT_STYLE}
      >
        {text}
      </text>
    </svg>
  );
}

interface CarouselFittedSvgNoteProps {
  line1: string;
  line2: string;
  maxWidthPx: number;
  testId?: string;
}

const NOTE_VIEW_H = 120;

export function CarouselFittedSvgNote({
  line1,
  line2,
  maxWidthPx,
  testId,
}: CarouselFittedSvgNoteProps) {
  if (maxWidthPx <= 0) return null;
  const heightPx = Math.max(22, maxWidthPx * (NOTE_VIEW_H / VIEW_W));

  return (
    <svg
      className="hk-chart__fitted-svg hk-chart__fitted-svg--note"
      width={maxWidthPx}
      height={heightPx}
      viewBox={`0 0 ${VIEW_W} ${NOTE_VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      data-testid={testId}
      role="img"
      aria-label={`${line1} ${line2}`}
    >
      <text
        x={VIEW_W / 2}
        y={38}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={34}
        fontWeight={600}
        lengthAdjust="spacingAndGlyphs"
        textLength={VIEW_W * 0.94}
        style={SVG_TEXT_STYLE}
      >
        {line1}
      </text>
      <text
        x={VIEW_W / 2}
        y={92}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={32}
        fontWeight={600}
        lengthAdjust="spacingAndGlyphs"
        textLength={VIEW_W * 0.94}
        style={SVG_TEXT_STYLE}
      >
        {line2}
      </text>
    </svg>
  );
}
