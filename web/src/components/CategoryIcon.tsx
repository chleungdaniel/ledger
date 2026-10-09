import type { CSSProperties } from "react";
import { categoryColor } from "../lib/categoryTheme";

const ICONS: Record<string, string> = {
  "fork-knife": "🍽",
  car: "🚗",
  house: "🏠",
  home: "🏡",
  bag: "🛍",
  game: "🎮",
  medical: "🏥",
  banknote: "💵",
  gift: "🎁",
  other: "⋯",
  plus: "➕",
};

interface CategoryIconProps {
  name: string;
  size?: "sm" | "md";
}

export function CategoryIcon({ name, size = "md" }: CategoryIconProps) {
  const { bg, fg } = categoryColor(name);
  return (
    <span
      className={`category-icon category-icon--${size}`}
      style={
        {
          "--cat-bg": bg,
          "--cat-fg": fg,
        } as CSSProperties
      }
      aria-hidden
    >
      {ICONS[name] ?? "📁"}
    </span>
  );
}

export const SYMBOL_OPTIONS = [
  "fork-knife",
  "car",
  "house",
  "home",
  "bag",
  "game",
  "medical",
  "banknote",
  "gift",
  "plus",
  "other",
] as const;
