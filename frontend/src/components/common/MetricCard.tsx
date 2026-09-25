import React from 'react';
import { Link } from 'react-router-dom';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  sublabel?: string;
  statusBadge?: {
    text: string;
    variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  };
  icon?: React.ReactNode;
  actionLink?: {
    label: string;
    to: string;
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  sublabel,
  statusBadge,
  icon,
  actionLink,
}) => {
  const badgeStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-teal-50 text-teal-700 border-teal-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5 shadow-clinical transition-all duration-200 hover:border-clinical-300 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium tracking-wider uppercase text-surface-500">
            {title}
          </span>
          {icon && <div className="text-surface-400">{icon}</div>}
        </div>

        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-2xl font-bold tracking-tight text-surface-900">
            {value}
          </span>
          {unit && <span className="text-xs font-medium text-surface-500">{unit}</span>}
        </div>

        {actionLink && (
          <div className="mt-1">
            <Link
              to={actionLink.to}
              className="inline-flex items-center gap-1 text-xs font-semibold text-clinical-600 hover:text-clinical-800 transition-colors"
            >
              <span>{actionLink.label}</span>
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-100">
        {sublabel ? (
          <span className="text-xs text-surface-500 truncate">{sublabel}</span>
        ) : (
          <span />
        )}
        {statusBadge && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badgeStyles[statusBadge.variant]}`}
          >
            {statusBadge.text}
          </span>
        )}
      </div>
    </div>
  );
};
