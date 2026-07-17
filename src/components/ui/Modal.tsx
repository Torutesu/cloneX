"use client";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-token bg-surface border border-border p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">{title}</h2>
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="text-text-muted hover:text-text"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
