import type { Category, Transaction } from "../../types";

const RULES: { pattern: RegExp; categoryName: string }[] = [
  { pattern: /巴士|鐵路|車資|Uber|的士|出租|港鐵|MTR|交通/i, categoryName: "交通" },
  {
    pattern:
      /Five Guys|燒肉|minimelts|Vincenzo|Capuano|pizza|冰淇淋|餐|飯|咖啡|food|restaurant|麵|茶餐/i,
    categoryName: "飲食",
  },
  { pattern: /PARKnSHOP|百佳|惠康|Fusion|超市|購物/i, categoryName: "購物" },
];

function learnFromHistory(transactions: Transaction[], categories: Category[]): Map<string, string> {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const scores = new Map<string, Map<string, number>>();

  for (const tx of transactions) {
    const note = tx.note.trim();
    if (note.length < 2) continue;
    const cat = byId.get(tx.categoryId);
    if (!cat) continue;
    const key = note.slice(0, 24).toLowerCase();
    const bucket = scores.get(key) ?? new Map();
    bucket.set(cat.name, (bucket.get(cat.name) ?? 0) + 1);
    scores.set(key, bucket);
  }

  const result = new Map<string, string>();
  for (const [noteKey, counts] of scores) {
    let best = "";
    let bestN = 0;
    for (const [name, n] of counts) {
      if (n > bestN) {
        bestN = n;
        best = name;
      }
    }
    if (best) result.set(noteKey, best);
  }
  return result;
}

export function suggestCategoryId(
  merchant: string,
  note: string,
  type: "expense" | "income",
  categories: Category[],
  transactions: Transaction[],
): string | null {
  const pool = categories.filter((c) => c.type === type);
  const haystack = `${merchant} ${note}`;

  if (type === "income" && /調整|退款/.test(haystack)) {
    const rebate = pool.find((c) => c.name === "回饋");
    if (rebate) return rebate.id;
  }

  const learned = learnFromHistory(transactions, categories);
  const noteKey = note.slice(0, 24).toLowerCase();
  const learnedName = learned.get(noteKey);
  if (learnedName) {
    const cat = pool.find((c) => c.name === learnedName);
    if (cat) return cat.id;
  }

  for (const { pattern, categoryName } of RULES) {
    if (!pattern.test(haystack)) continue;
    const cat = pool.find((c) => c.name === categoryName);
    if (cat) return cat.id;
  }

  const fallback = pool.find((c) => c.name === (type === "income" ? "其他收入" : "其他"));
  return fallback?.id ?? pool[0]?.id ?? null;
}
