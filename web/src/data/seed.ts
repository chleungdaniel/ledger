import { newId } from "../lib/format";
import type { Category } from "../types";

export const DEFAULT_CATEGORIES: Omit<Category, "id" | "createdAt">[] = [
  { name: "飲食", type: "expense", iconName: "fork-knife", isSeeded: true, sortOrder: 0 },
  { name: "交通", type: "expense", iconName: "car", isSeeded: true, sortOrder: 1 },
  { name: "租金", type: "expense", iconName: "house", isSeeded: true, sortOrder: 2 },
  { name: "購物", type: "expense", iconName: "bag", isSeeded: true, sortOrder: 3 },
  { name: "娛樂", type: "expense", iconName: "game", isSeeded: true, sortOrder: 4 },
  { name: "醫療", type: "expense", iconName: "medical", isSeeded: true, sortOrder: 5 },
  { name: "薪資", type: "income", iconName: "banknote", isSeeded: true, sortOrder: 6 },
  { name: "其他", type: "expense", iconName: "other", isSeeded: true, sortOrder: 7 },
  { name: "其他收入", type: "income", iconName: "plus", isSeeded: true, sortOrder: 8 },
];

export function createSeedCategories(): Category[] {
  const now = new Date().toISOString();
  return DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    id: newId(),
    createdAt: now,
  }));
}
