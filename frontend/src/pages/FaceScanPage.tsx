import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  HeartPulse,
  Activity,
  RefreshCw,
  Save,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Play,
  Square,
  ShieldAlert,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { useRppgScanner } from '../hooks/useRppgScanner';
import { useLanguage } from '../context/LanguageContext';
import { MedicalDisclaimer } from '../components/common/MedicalDisclaimer';
import { MetricCard } from '../components/common/MetricCard';

export const FaceScanPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const {
    videoRef,
    canvasRef,
    scanState,
    statusMessage,
    isScanning,
    progress,
    estimatedHeartRate,
    stressLevel,
    riskLevel,
    faceQuality,
    signalQuality,
    confidence,
    pulseWaveform,
    startScan,
    stopScan,
    recalibrate,
    saveScanResult,
  } = useRppgScanner();

  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Draw real-time rPPG arterial pulse waveform to canvas
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw background grid lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw pulse curve if samples exist
    if (pulseWaveform.length > 2) {
      ctx.strokeStyle = '#0d9488'; // Clinical teal
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const step = width / (pulseWaveform.length - 1);
      const midY = height / 2;

      pulseWaveform.forEach((val, idx) => {
        const x = idx * step;
        const y = midY - val * (height * 0.38);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();
    } else {
      // Resting baseline indicator
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [pulseWaveform]);

  const handleSave = async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      const ok = await saveScanResult();
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save screening record');
    } finally {
      setIsSaving(false);
    }
  };

  const isComplete = scanState === 'COMPLETE';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Introduction */}
      <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-clinical-600 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200">
            Contactless Photoplethysmography
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 mt-1">
            {t('scan_title')}
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            {t('scan_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isScanning ? (
            <button
              onClick={startScan}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-xl shadow-clinical transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{t('scan_btn_start')}</span>
            </button>
          ) : (
            <>
              <button
                onClick={stopScan}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-rose-700" />
                <span>{t('scan_btn_stop')}</span>
              </button>
              <button
                onClick={recalibrate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-surface-700 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-xl transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-clinical-600" />
                <span>{t('scan_btn_recalibrate')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Prominent Medical Safety Notice */}
      <MedicalDisclaimer />

      {/* Main Two-Column Scanning Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Camera Stream, Face Alignment & Real Waveform (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative bg-surface-900 rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center border border-surface-800 shadow-elevation">
            {/* Live Web Camera Video Element */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                !isScanning ? 'hidden' : 'block'
              }`}
            />

            {/* Offscreen frame sampling canvas */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Inactive Camera State Overlay & 4-Step Preparation Guide */}
            {!isScanning && (
              <div className="text-center p-6 space-y-4 max-w-md mx-auto">
                <div className="w-12 h-12 mx-auto rounded-full bg-surface-800 flex items-center justify-center text-clinical-400">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Contactless Screening Preparation
                  </h3>
                  <p className="text-xs text-surface-400 mt-0.5">
                    Follow these recommendations for optimal optical extraction:
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left">
                  <div className="p-2.5 bg-surface-800/80 rounded-xl border border-surface-700/80">
                    <span className="text-[10px] font-bold text-clinical-400 uppercase tracking-wider block">
                      1. Face Camera
                    </span>
                    <span className="text-[11px] text-surface-300">
                      Look directly forward at the lens
                    </span>
                  </div>
                  <div className="p-2.5 bg-surface-800/80 rounded-xl border border-surface-700/80">
                    <span className="text-[10px] font-bold text-clinical-400 uppercase tracking-wider block">
                      2. Inside Frame
                    </span>
                    <span className="text-[11px] text-surface-300">
                      Align face inside the oval guide
                    </span>
                  </div>
                  <div className="p-2.5 bg-surface-800/80 rounded-xl border border-surface-700/80">
                    <span className="text-[10px] font-bold text-clinical-400 uppercase tracking-wider block">
                      3. Stay Still
                    </span>
                    <span className="text-[11px] text-surface-300">
                      Remain steady for 30–60 seconds
                    </span>
                  </div>
                  <div className="p-2.5 bg-surface-800/80 rounded-xl border border-surface-700/80">
                    <span className="text-[10px] font-bold text-clinical-400 uppercase tracking-wider block">
                      4. Good Lighting
                    </span>
                    <span className="text-[11px] text-surface-300">
                      Ensure face is evenly and well lit
                    </span>
                  </div>
                </div>

                <button
                  onClick={startScan}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-xl shadow-clinical transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Screening</span>
                </button>
              </div>
            )}

            {/* Live Scanning Face Guide Overlay */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* Face Guide Oval */}
                <div
                  className={`w-48 h-64 sm:w-56 sm:h-72 rounded-[50%] border-2 transition-colors duration-300 ${
                    scanState === 'HOLD_STILL'
                      ? 'border-amber-400 animate-pulse'
                      : scanState === 'POOR_LIGHTING'
                      ? 'border-rose-400'
                      : faceQuality > 70
                      ? 'border-clinical-400'
                      : 'border-surface-400/80 border-dashed'
                  }`}
                />

                {/* Forehead ROI Target Area Indicator */}
                <div className="absolute top-[22%] w-24 h-10 border border-teal-300/80 bg-teal-400/10 rounded flex items-center justify-center">
                  <span className="text-[9px] text-teal-200 tracking-wider uppercase font-semibold">
                    Forehead ROI
                  </span>
                </div>

                {/* Live Status Pill */}
                <div className="absolute bottom-4 bg-surface-950/85 backdrop-blur px-3.5 py-1.5 rounded-full border border-surface-700 text-xs text-white flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      scanState === 'COMPLETE'
                        ? 'bg-emerald-400'
                        : scanState === 'HOLD_STILL'
                        ? 'bg-amber-400'
                        : scanState === 'POOR_LIGHTING'
                        ? 'bg-rose-400'
                        : 'bg-clinical-400 animate-ping'
                    }`}
                  />
                  <span>{statusMessage}</span>
                </div>
              </div>
            )}
          </div>

          {/* Collection Progress Bar */}
          {isScanning && (
            <div className="bg-white border border-surface-200 p-4 rounded-xl space-y-1.5 shadow-subtle">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-surface-700">
                  Screening Signal Window
                </span>
                <span className="font-bold text-clinical-700">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-clinical-600 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Real Arterial Pulse Waveform Visualizer */}
          <div className="bg-white border border-surface-200 p-4 rounded-xl shadow-subtle space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-clinical-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-surface-800">
                  Live Photoplethysmographic Arterial Pulse Wave
                </span>
              </div>
              <span className="text-[11px] text-surface-400">
                Green-differential (2G-R-B)
              </span>
            </div>
            <div className="h-28 w-full bg-surface-50 rounded-lg overflow-hidden border border-surface-100">
              <canvas
                ref={waveformCanvasRef}
                width={500}
                height={112}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Vitals Estimation & Signal Metrics (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quality Warning if Signal Insufficient */}
          {(scanState === 'HOLD_STILL' || scanState === 'POOR_LIGHTING') && signalQuality < 35 && progress > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                    Signal Quality Alert
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Insufficient signal quality. Please remain still and improve lighting before continuing.
                  </p>
                </div>
              </div>
              <button
                onClick={recalibrate}
                className="w-full py-2 px-3 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                <span>Recalibrate & Retry</span>
              </button>
            </div>
          )}

          <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
                  Physiological Screening Vitals
                </h2>
              </div>
              {isComplete ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  SCREENING COMPLETE
                </span>
              ) : (
                <span className="text-[10px] text-clinical-600 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200 font-semibold">
                  Decision Support
                </span>
              )}
            </div>

            {/* Estimated Heart Rate Card */}
            <div className={`p-4 rounded-xl border transition-colors ${isComplete ? 'bg-clinical-50/40 border-clinical-200' : 'bg-surface-50 border-surface-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-surface-600 uppercase tracking-wide">
                  {t('scan_metric_hr')}
                </span>
                <HeartPulse className="w-4 h-4 text-clinical-600" />
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-surface-900">
                  {estimatedHeartRate !== null ? estimatedHeartRate : '—'}
                </span>
                <span className="text-xs font-bold text-surface-500">BPM</span>
              </div>

              <p className="text-[11px] text-surface-400 mt-1">
                Estimated from facial pulse transit timing and peak intervals
              </p>
            </div>

            {/* Stress & Risk Patterns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-surface-50 border border-surface-200 rounded-xl">
                <span className="text-[10px] font-bold text-surface-500 uppercase tracking-wide block mb-1">
                  {t('scan_metric_stress')}
                </span>
                <span className="text-sm font-bold text-surface-800">
                  {estimatedHeartRate !== null ? stressLevel : '—'}
                </span>
                <span className="text-[10px] text-surface-400 block mt-0.5">
                  HRV RMSSD index
                </span>
              </div>

              <div className="p-3.5 bg-surface-50 border border-surface-200 rounded-xl">
                <span className="text-[10px] font-bold text-surface-500 uppercase tracking-wide block mb-1">
                  {t('scan_metric_risk')}
                </span>
                <span
                  className={`text-sm font-bold ${
                    riskLevel === 'HIGH_RISK'
                      ? 'text-rose-600'
                      : riskLevel === 'ATTENTION'
                      ? 'text-amber-600'
                      : 'text-surface-800'
                  }`}
                >
                  {estimatedHeartRate !== null ? riskLevel : '—'}
                </span>
                <span className="text-[10px] text-surface-400 block mt-0.5">
                  Screening band
                </span>
              </div>
            </div>

            {/* Signal Reliability & Face Alignment */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-surface-500 font-medium">Signal Quality Index</span>
                  <span className="font-bold text-surface-800">{signalQuality}%</span>
                </div>
                <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 transition-all duration-300 rounded-full"
                    style={{ width: `${signalQuality}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-surface-500 font-medium">Signal Confidence</span>
                  <span className="font-bold text-surface-800">{confidence}%</span>
                </div>
                <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-clinical-600 transition-all duration-300 rounded-full"
                    style={{ width: `${confidence}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-surface-500 font-medium">Face Alignment Quality</span>
                  <span className="font-bold text-surface-800">{faceQuality}%</span>
                </div>
                <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300 rounded-full"
                    style={{ width: `${faceQuality}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Completed Scan Actions Hierarchy */}
            {isComplete && (
              <div className="pt-4 border-t border-surface-100 space-y-2.5">
                <span className="text-[11px] font-bold text-surface-700 uppercase tracking-wider block">
                  Next Actions
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => navigate('/analysis')}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-clinical-600 hover:bg-clinical-700 text-white text-xs font-semibold rounded-xl shadow-clinical transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>View Analysis</span>
                  </button>

                  <button
                    onClick={() => navigate('/appointments?tab=book')}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-navy-800 hover:bg-navy-900 text-white text-xs font-semibold rounded-xl shadow-subtle transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Book Consult</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={!estimatedHeartRate || isSaving}
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-clinical-300 hover:bg-clinical-50 text-clinical-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Record'}</span>
                  </button>

                  <button
                    onClick={recalibrate}
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-surface-200 hover:bg-surface-100 text-surface-700 text-xs font-medium rounded-xl transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-clinical-600" />
                    <span>Retake Scan</span>
                  </button>
                </div>
              </div>
            )}

            {/* In-Progress Save Scan CTA if not complete yet */}
            {!isComplete && (
              <div className="pt-3 border-t border-surface-100 space-y-2">
                <button
                  onClick={handleSave}
                  disabled={!estimatedHeartRate || isSaving}
                  className="w-full py-2.5 px-4 bg-clinical-600 hover:bg-clinical-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-clinical flex items-center justify-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : t('scan_btn_save')}</span>
                </button>
              </div>
            )}

            {/* Save Alerts */}
            {saveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Screening session successfully saved to your health record.</span>
              </div>
            )}

            {saveError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
