import React from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, visible }) => {
  if (!visible || !message) return null;
  return (
    <div className="toast show" role="status" aria-live="polite">
      {message}
    </div>
  );
};
