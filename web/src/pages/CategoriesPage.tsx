import { useMemo, useState } from "react";
import { PwaSyncControls } from "../components/PwaSyncControls";
import { CategoryIcon, SYMBOL_OPTIONS } from "../components/CategoryIcon";
import { transactionCountForCategory } from "../lib/analytics";
import { useLedger } from "../store/LedgerContext";
import type { Category, TransactionType } from "../types";
import { TRANSACTION_TYPE_LABEL } from "../types";

export function CategoriesPage() {
  const { categories, transactions, upsertCategory, removeCategory } = useLedger();
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [newType, setNewType] = useState<TransactionType>("expense");
  const [alert, setAlert] = useState<string | null>(null);

  const expense = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );
  const income = useMemo(
    () => categories.filter((c) => c.type === "income"),
    [categories],
  );

  if (editing) {
    const isNew = editing === "new";
    const cat = isNew ? null : editing;
    return (
      <CategoryEditor
        category={cat}
        defaultType={newType}
        onClose={() => setEditing(null)}
        onSave={async (data) => {
          await upsertCategory(data);
          setEditing(null);
        }}
        onDelete={async (id) => {
          const result = await removeCategory(id);
          if (!result.ok) {
            setAlert(result.reason);
            return;
          }
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="page" data-testid="categories-page">
      <header className="page-header">
        <h1>分類</h1>
      </header>
      <section className="section section--tight pad-horizontal">
        <PwaSyncControls variant="import" />
      </section>
      {alert && (
        <div className="banner banner--warn" role="alert">
          {alert}
          <button type="button" className="btn-text" onClick={() => setAlert(null)}>關閉</button>
        </div>
      )}
      <CategorySection
        title="支出分類"
        items={expense}
        transactions={transactions}
        onAdd={() => {
          setNewType("expense");
          setEditing("new");
        }}
        onEdit={setEditing}
        onDelete={async (id) => {
          const result = await removeCategory(id);
          if (!result.ok) setAlert(result.reason);
        }}
      />
      <CategorySection
        title="收入分類"
        items={income}
        transactions={transactions}
        onAdd={() => {
          setNewType("income");
          setEditing("new");
        }}
        onEdit={setEditing}
        onDelete={async (id) => {
          const result = await removeCategory(id);
          if (!result.ok) setAlert(result.reason);
        }}
      />
    </div>
  );
}

function CategorySection({
  title,
  items,
  transactions,
  onAdd,
  onEdit,
  onDelete,
}: {
  title: string;
  items: Category[];
  transactions: import("../types").Transaction[];
  onAdd: () => void;
  onEdit: (c: Category) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="section">
      <h2>{title}</h2>
      <div className="list-card">
        {items.length === 0 && <p className="muted pad">尚無分類</p>}
        {items.map((c) => {
          const count = transactionCountForCategory(transactions, c.id);
          return (
            <div key={c.id} className="category-row">
              <button type="button" className="category-row__main" onClick={() => onEdit(c)}>
                <CategoryIcon name={c.iconName} />
                <span>{c.name}</span>
                {count > 0 && <span className="badge">{count} 筆</span>}
              </button>
              {count === 0 && (
                <button
                  type="button"
                  className="btn-icon"
                  aria-label={`刪除 ${c.name}`}
                  onClick={() => void onDelete(c.id)}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
        <button type="button" className="list-action" onClick={onAdd}>
          ＋ 新增分類
        </button>
      </div>
    </section>
  );
}

function CategoryEditor({
  category,
  defaultType,
  onClose,
  onSave,
  onDelete,
}: {
  category: Category | null;
  defaultType: TransactionType;
  onClose: () => void;
  onSave: (
    data: Omit<Category, "id" | "createdAt"> & { id?: string },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [type] = useState(category?.type ?? defaultType);
  const [iconName, setIconName] = useState<string>(category?.iconName ?? SYMBOL_OPTIONS[0]);

  return (
    <div className="full-screen-form">
      <header className="toolbar">
        <button type="button" className="btn-text" onClick={onClose}>取消</button>
        <h1>{category ? "編輯分類" : "新增分類"}</h1>
        <button
          type="button"
          className="btn-text btn-text--primary"
          onClick={() =>
            void onSave({
              id: category?.id,
              name: name.trim(),
              type,
              iconName,
              isSeeded: category?.isSeeded ?? false,
              sortOrder: category?.sortOrder ?? Date.now(),
            })
          }
          disabled={!name.trim()}
        >
          儲存
        </button>
      </header>
      <div className="form-stack">
        <label className="field">
          <span>名稱</span>
          <input value={name} onChange={(e) => setName(e.target.value)} data-testid="cat-name" />
        </label>
        {!category && (
          <p className="hint">類型：{TRANSACTION_TYPE_LABEL[type]}</p>
        )}
        <div className="field">
          <span>圖示</span>
          <div className="icon-grid">
            {SYMBOL_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className={iconName === s ? "active" : ""}
                onClick={() => setIconName(s)}
              >
                <CategoryIcon name={s} />
              </button>
            ))}
          </div>
        </div>
        {category && (
          <button
            type="button"
            className="btn-danger"
            onClick={() => void onDelete(category.id)}
          >
            刪除分類
          </button>
        )}
      </div>
    </div>
  );
}
