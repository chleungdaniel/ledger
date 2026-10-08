const ICONS: Record<string, string> = {
  "fork-knife": "🍽",
  car: "🚗",
  house: "🏠",
  bag: "🛍",
  game: "🎮",
  medical: "🏥",
  banknote: "💵",
  other: "⋯",
  plus: "➕",
};

export function CategoryIcon({ name }: { name: string }) {
  return (
    <span className="category-icon" aria-hidden>
      {ICONS[name] ?? "📁"}
    </span>
  );
}

export const SYMBOL_OPTIONS = [
  "fork-knife",
  "car",
  "house",
  "bag",
  "game",
  "medical",
  "banknote",
  "plus",
  "other",
] as const;
