import React from 'react';
import { ShieldCheck, HeartPulse } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-white border-t border-surface-200 mt-16 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-clinical-600 flex items-center justify-center text-white">
              <HeartPulse className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm tracking-tight text-surface-900">
              AI-PULSE
            </span>
            <span className="text-xs text-surface-500 pl-2 border-l border-surface-200">
              AI-Assisted Telemedicine & Screening Architecture
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-surface-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-clinical-600" />
              Privacy-Focused Role-Isolated Clinical Architecture
            </span>
            <span>•</span>
            <span>Investigational Decision Support</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-surface-100 text-center">
          <p className="text-[11px] text-surface-400 max-w-4xl mx-auto leading-relaxed">
            {t('medical_disclaimer')}
          </p>
        </div>
      </div>
    </footer>
  );
};
