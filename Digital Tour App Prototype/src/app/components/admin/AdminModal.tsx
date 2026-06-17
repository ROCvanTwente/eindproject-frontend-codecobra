import React from "react";
import { X, AlertTriangle, CheckCircle } from "lucide-react";
import { Language } from "../../types";

interface ConfirmModalProps {
  language: Language;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  language,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const defaultConfirm =
    confirmLabel ?? (language === "nl" ? "Verwijderen" : "Delete");
  const defaultCancel =
    cancelLabel ?? (language === "nl" ? "Annuleren" : "Cancel");

  return (
    <ModalOverlay onClose={onCancel}>
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            variant === "danger"
              ? "bg-red-100 text-red-600"
              : "bg-yellow-100 text-yellow-600"
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {title}
          </h3>
          <p className="text-gray-600 text-sm">{message}</p>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:cursor-pointer transition-colors"
        >
          {defaultCancel}
        </button>
        <button
          onClick={onConfirm}
          className={`px-4 py-2 rounded-lg text-white transition-colors ${
            variant === "danger"
              ? "bg-red-600 hover:bg-red-700 hover:cursor-pointer"
              : "bg-yellow-600 hover:bg-yellow-700 hover:cursor-pointer"
          }`}
        >
          {defaultConfirm}
        </button>
      </div>
    </ModalOverlay>
  );
}

interface AlertModalProps {
  language: Language;
  title: string;
  message: string;
  variant?: "error" | "success" | "info";
  onClose: () => void;
}

export function AlertModal({
  language,
  title,
  message,
  variant = "info",
  onClose,
}: AlertModalProps) {
  const okLabel = language === "nl" ? "OK" : "OK";

  const iconClass =
    variant === "error"
      ? "bg-red-100 text-red-600"
      : variant === "success"
      ? "bg-green-100 text-green-600"
      : "bg-blue-100 text-[#0066B3]";

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconClass}`}
        >
          {variant === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {title}
          </h3>
          <p className="text-gray-600 text-sm">{message}</p>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-[#0066B3] text-white hover:opacity-90 hover:cursor-pointer transition-opacity"
        >
          {okLabel}
        </button>
      </div>
    </ModalOverlay>
  );
}

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 border-2 border-gray-100">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 hover:cursor-pointer transition-colors"
          aria-label="Sluiten"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

