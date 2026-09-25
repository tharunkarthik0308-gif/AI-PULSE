import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white border border-dashed border-surface-200 rounded-xl">
      <div className="p-3 mb-3 text-clinical-600 bg-clinical-50 rounded-full">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-surface-900 mb-1">{title}</h3>
      <p className="text-xs text-surface-500 max-w-sm mb-4 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-subtle transition-colors focus:ring-2 focus:ring-clinical-500"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
