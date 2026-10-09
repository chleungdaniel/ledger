/** Per-category accent for chips and list icons (expense / income palettes). */
export const CATEGORY_COLORS: Record<string, { bg: string; fg: string }> = {
  "fork-knife": { bg: "#ff6b6b33", fg: "#ff6b6b" },
  car: { bg: "#4dabf733", fg: "#339af0" },
  house: { bg: "#ffa94d33", fg: "#f76707" },
  home: { bg: "#99f6e433", fg: "#0d9488" },
  bag: { bg: "#ff922b33", fg: "#e8590c" },
  game: { bg: "#67e8f933", fg: "#0891b2" },
  medical: { bg: "#63e6be33", fg: "#12b886" },
  banknote: { bg: "#51cf6633", fg: "#2f9e44" },
  gift: { bg: "#fcc41933", fg: "#f08c00" },
  other: { bg: "#868e9633", fg: "#495057" },
  plus: { bg: "#69db7c33", fg: "#37b24d" },
};

export function categoryColor(iconName: string) {
  return CATEGORY_COLORS[iconName] ?? CATEGORY_COLORS.other;
}
