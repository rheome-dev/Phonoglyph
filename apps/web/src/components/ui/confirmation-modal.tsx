import React from "react";
import { GlassModal } from "./glass-modal";
import { TechnicalButton } from "./technical-button";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  confirmVariant?: "primary" | "danger";
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  confirmVariant = "danger",
}) => (
  <GlassModal isOpen={isOpen} onClose={onClose} className="max-w-lg w-auto min-w-[320px] px-6 py-8 flex flex-col items-center justify-center">
    <h2 className="text-xl font-bold text-stone-100 mb-2 text-center w-full">{title}</h2>
    {description && <p className="text-stone-300 mb-6 text-center w-full">{description}</p>}
    <div className="flex justify-end gap-4 mt-6 w-full">
      <TechnicalButton variant="secondary" onClick={onClose}>
        Cancel
      </TechnicalButton>
      <TechnicalButton variant={confirmVariant === 'danger' ? 'primary' : confirmVariant} onClick={onConfirm}>
        {confirmText}
      </TechnicalButton>
    </div>
  </GlassModal>
); 