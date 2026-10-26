import { PwaSyncControls } from "../PwaSyncControls";
import { isStandalonePwa } from "../../lib/runtimeContext";

type Tab = "budget" | "reports" | "categories";

interface HomeMenuDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenImport: () => void;
  onOpenInbox: () => void;
  onNavigate: (tab: Tab) => void;
}

export function HomeMenuDrawer({
  open,
  onClose,
  onOpenImport,
  onOpenInbox,
  onNavigate,
}: HomeMenuDrawerProps) {
  if (!open) return null;
  return (
    <div className="hk-drawer" role="dialog" aria-modal="true" data-testid="home-menu">
      <button type="button" className="hk-drawer__backdrop" aria-label="關閉" onClick={onClose} />
      <div className="hk-drawer__panel">
        <h2>選單</h2>
        <button type="button" className="hk-drawer__item" onClick={() => { onNavigate("budget"); onClose(); }}>
          預算
        </button>
        <button type="button" className="hk-drawer__item" onClick={() => { onNavigate("reports"); onClose(); }}>
          報表
        </button>
        <button type="button" className="hk-drawer__item" onClick={() => { onNavigate("categories"); onClose(); }}>
          分類
        </button>
        <button
          type="button"
          className="hk-drawer__item"
          data-testid="open-imports-inbox"
          onClick={() => {
            onOpenInbox();
            onClose();
          }}
        >
          匯入紀錄
        </button>
        <button
          type="button"
          className="hk-drawer__item"
          data-testid="quick-import"
          onClick={() => {
            onOpenImport();
            onClose();
          }}
        >
          匯入截圖
        </button>
        {isStandalonePwa() && (
          <div className="hk-drawer__sync">
            <PwaSyncControls variant="import" />
          </div>
        )}
        <button type="button" className="hk-drawer__close" onClick={onClose}>關閉</button>
      </div>
    </div>
  );
}
