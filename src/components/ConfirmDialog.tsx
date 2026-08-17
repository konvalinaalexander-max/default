"use client";

interface ConfirmDialogProps {
  title: string;
  message: string;
  tone?: "warning" | "default";
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  tone = "default",
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isWarning = tone === "warning";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className={`w-full max-w-sm rounded-2xl border-2 bg-white p-5 shadow-xl ${
          isWarning ? "border-red-500" : "border-neutral-200"
        }`}
      >
        <h2 className={`text-xl font-bold ${isWarning ? "text-red-700" : "text-neutral-900"}`}>
          {isWarning ? "⚠️ " : ""}
          {title}
        </h2>
        <p className="mt-2 whitespace-pre-line text-base text-neutral-700">{message}</p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl py-3.5 text-lg font-semibold text-white ${
              isWarning ? "bg-red-600 active:bg-red-700" : "bg-orange-600 active:bg-orange-700"
            }`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-neutral-300 py-3.5 text-lg font-medium text-neutral-700"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
