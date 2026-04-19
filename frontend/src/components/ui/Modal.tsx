import React from 'react';

/**
 * Modal component - Generic reusable modal
 */
export default function Modal({ children, isOpen, onClose }: any) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
