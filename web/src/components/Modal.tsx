import { type ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-sheet__header">
          <button type="button" className="btn-text" onClick={onClose}>
            取消
          </button>
          <h2 id="modal-title">{title}</h2>
          <span className="modal-sheet__spacer" />
        </header>
        <div className="modal-sheet__body">{children}</div>
      </div>
    </div>
  );
}
