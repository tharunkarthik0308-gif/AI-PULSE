import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const MedicalDisclaimer: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { t } = useLanguage();

  if (compact) {
    return (
      <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-2.5 flex items-start gap-2 text-xs text-amber-900 leading-relaxed">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-950">Screening Tool Notice: </span>
          {t('medical_disclaimer')}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-subtle">
      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="text-sm text-amber-950 space-y-1">
        <p className="font-semibold text-amber-900 tracking-wide uppercase text-xs">
          Important Medical Safety Notice & Disclaimer
        </p>
        <p className="text-amber-800 leading-relaxed font-normal">
          {t('medical_disclaimer')}
        </p>
        <p className="text-xs text-amber-700/90 pt-0.5">
          {t('emergency_warning')}
        </p>
      </div>
    </div>
  );
};
