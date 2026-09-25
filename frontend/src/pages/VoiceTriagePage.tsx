import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Globe,
  AlertCircle,
  CheckCircle,
  Calendar,
  Send,
  Sparkles,
  HelpCircle,
  ShieldAlert,
  Keyboard,
} from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { MedicalDisclaimer } from '../components/common/MedicalDisclaimer';

export const VoiceTriagePage: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const [triageLanguage, setTriageLanguage] = useState<'en' | 'ta' | 'hi'>((language as any) || 'en');
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [triageResult, setTriageResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setInputMode('text');
      return;
    }

    setSpeechSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    const langMap = {
      en: 'en-US',
      ta: 'ta-IN',
      hi: 'hi-IN',
    };
    recognition.lang = langMap[triageLanguage] || 'en-US';

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      setInputMode('text');
      setError('Voice input is not supported or was denied in this browser. Type your symptoms below instead.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [triageLanguage]);

  const toggleListening = () => {
    if (!recognitionRef.current || !speechSupported) {
      setInputMode('text');
      setError('Voice input is not supported or was denied in this browser. Type your symptoms below instead.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      setTranscript('');
      setTriageResult(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech recognition start failed:', err);
        setInputMode('text');
        setError('Voice input is not supported or was denied in this browser. Type your symptoms below instead.');
      }
    }
  };

  const handleEvaluate = async () => {
    if (!transcript.trim()) return;
    setEvaluating(true);
    setError(null);
    try {
      const res = await api.evaluateTriage(transcript, triageLanguage);
      if (res.success) {
        setTriageResult(res.result);
      }
    } catch (err: any) {
      setError(err.message || 'Error evaluating triage assessment.');
    } finally {
      setEvaluating(false);
    }
  };

  const urgencyStyles = {
    ROUTINE: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      badge: 'bg-emerald-100 text-emerald-800',
    },
    MEDICAL_ATTENTION: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      badge: 'bg-amber-100 text-amber-800',
    },
    URGENT_EVALUATION: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-800',
      badge: 'bg-rose-100 text-rose-800',
    },
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title Card */}
      <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-clinical-600 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200">
            Multilingual Symptom Triage
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 mt-1">
            {t('triage_title')}
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            {t('triage_subtitle')}
          </p>
        </div>

        {/* Language Selection */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-100 rounded-xl border border-surface-200">
          <Globe className="w-4 h-4 text-surface-500 ml-2" />
          <button
            onClick={() => setTriageLanguage('en')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              triageLanguage === 'en'
                ? 'bg-white text-clinical-700 shadow-subtle border border-surface-200'
                : 'text-surface-600'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setTriageLanguage('ta')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              triageLanguage === 'ta'
                ? 'bg-white text-clinical-700 shadow-subtle border border-surface-200'
                : 'text-surface-600'
            }`}
          >
            தமிழ்
          </button>
          <button
            onClick={() => setTriageLanguage('hi')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              triageLanguage === 'hi'
                ? 'bg-white text-clinical-700 shadow-subtle border border-surface-200'
                : 'text-surface-600'
            }`}
          >
            हिंदी
          </button>
        </div>
      </div>

      <MedicalDisclaimer />

      {/* Symptom Input Console (Voice with Type Fallback) */}
      <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle space-y-6">
        {/* Mode Selector Tabs */}
        <div className="flex items-center justify-center gap-2 pb-2 border-b border-surface-100">
          <button
            type="button"
            onClick={() => {
              if (!speechSupported) {
                setError('Voice input is not supported in this browser. Type your symptoms below instead.');
                return;
              }
              setError(null);
              setInputMode('voice');
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              inputMode === 'voice'
                ? 'bg-clinical-600 text-white shadow-clinical'
                : 'bg-surface-100 text-surface-600 hover:text-surface-900'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Speak Symptoms</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (isListening && recognitionRef.current) {
                recognitionRef.current.stop();
                setIsListening(false);
              }
              setInputMode('text');
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              inputMode === 'text'
                ? 'bg-clinical-600 text-white shadow-clinical'
                : 'bg-surface-100 text-surface-600 hover:text-surface-900'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>Type Symptoms</span>
          </button>
        </div>

        {/* Voice Mode Visuals */}
        {inputMode === 'voice' && (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <button
              onClick={toggleListening}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-clinical ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse ring-8 ring-rose-100'
                  : 'bg-clinical-600 hover:bg-clinical-700 text-white'
              }`}
            >
              {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>

            <p className="mt-4 text-xs font-semibold text-surface-700">
              {isListening ? t('triage_listening') : t('triage_speak_prompt')}
            </p>
            <span className="text-[11px] text-surface-400 mt-0.5">
              Target Speech Engine: {triageLanguage.toUpperCase()}
            </span>
          </div>
        )}

        {/* Text Mode Guidance */}
        {inputMode === 'text' && (
          <div className="p-3.5 bg-clinical-50/50 border border-clinical-100 rounded-xl flex items-center gap-2.5 text-xs text-clinical-900">
            <Keyboard className="w-4 h-4 text-clinical-600 shrink-0" />
            <span>
              Type your symptoms below in your preferred language (English, Tamil, Hindi) for automated clinical triage evaluation.
            </span>
          </div>
        )}

        {/* Live Transcript / Manual Input Area */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider">
            {inputMode === 'voice' ? 'Symptom Description Transcript' : 'Type Your Symptoms'}
          </label>
          <textarea
            rows={4}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={
              inputMode === 'voice'
                ? t('triage_manual_input')
                : 'Describe your symptoms in detail (e.g. "I have had a mild headache and low fever for the past 2 days, no chest pain")...'
            }
            className="w-full p-3.5 text-sm bg-surface-50 border border-surface-200 rounded-xl text-surface-900 focus:bg-white focus:border-clinical-500 focus:ring-1 focus:ring-clinical-500 transition-colors"
          />
        </div>

        {error && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-surface-400">
            {transcript.trim().length > 0 ? `${transcript.trim().split(/\s+/).length} words entered` : 'Ready for input'}
          </span>

          <button
            onClick={handleEvaluate}
            disabled={evaluating || !transcript.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-clinical-600 hover:bg-clinical-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-clinical transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>{evaluating ? 'Assessing...' : t('triage_evaluate_btn')}</span>
          </button>
        </div>
      </div>

      {/* Triage Decision Support Result */}
      {triageResult && (
        <div
          className={`border rounded-2xl p-6 shadow-elevation space-y-4 ${
            urgencyStyles[triageResult.urgency as keyof typeof urgencyStyles]?.bg || 'bg-white'
          } ${
            urgencyStyles[triageResult.urgency as keyof typeof urgencyStyles]?.border || 'border-surface-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                urgencyStyles[triageResult.urgency as keyof typeof urgencyStyles]?.badge
              }`}
            >
              {triageResult.urgencyLabel}
            </span>
            <span className="text-[10px] text-surface-500 uppercase tracking-wider font-semibold">
              Decision Support
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-surface-900 leading-relaxed">
              {triageResult.explanation}
            </p>

            <div className="p-3.5 bg-white/80 rounded-xl border border-surface-200 text-xs text-surface-700">
              <span className="font-semibold text-surface-900">Recommended Action: </span>
              {triageResult.recommendedAction}
            </div>

            {triageResult.symptomsDetected && triageResult.symptomsDetected.length > 0 && (
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[11px] font-semibold text-surface-600">Extracted Symptoms:</span>
                {triageResult.symptomsDetected.map((sym: string, i: number) => (
                  <span
                    key={i}
                    className="text-[11px] bg-white border border-surface-200 px-2 py-0.5 rounded text-surface-700 capitalize"
                  >
                    {sym}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-surface-200/80 flex items-center justify-between">
            <p className="text-[11px] text-surface-500 italic max-w-sm">
              {triageResult.disclaimer}
            </p>
            <button
              onClick={() => navigate('/appointments')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-subtle transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{t('triage_cta_book')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
