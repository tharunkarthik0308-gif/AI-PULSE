import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  HeartPulse,
  Brain,
  Calendar,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  User,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { MedicalDisclaimer } from '../components/common/MedicalDisclaimer';
import { EmptyState } from '../components/common/EmptyState';

export const HealthAnalysisPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isDoctor = user?.role === 'DOCTOR';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const patientIdParam = searchParams.get('patientId');

  const [timeRange, setTimeRange] = useState<'7' | '30' | '90' | 'all'>('30');
  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [requiresPatientSelection, setRequiresPatientSelection] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);

  const fetchAnalysis = async (range: string) => {
    try {
      setLoading(true);
      setPatientError(null);
      const res = await api.getHealthAnalysis(range === 'all' ? '0' : range, patientIdParam || undefined);
      if (res.success) {
        if (res.requiresPatientSelection) {
          setRequiresPatientSelection(true);
          setAnalysisData(null);
          setSelectedPatient(null);
        } else {
          setRequiresPatientSelection(false);
          setAnalysisData(res.data);
          if (res.patient) {
            setSelectedPatient(res.patient);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching health analysis:', err);
      if (err.message?.includes('Access denied') || err.message?.includes('clinical relationship') || err.message?.includes('403')) {
        setPatientError(err.message || 'Access denied. You do not have an active clinical relationship with this patient.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis(timeRange);
  }, [timeRange, patientIdParam]);

  const { totalScans = 0, scans = [], riskDistribution = {}, stressDistribution = {}, aiSummary } =
    analysisData || {};

  // Format scan data for Recharts
  const chartData = scans.map((s: any) => ({
    date: new Date(s.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    hr: s.estimatedHeartRate,
    confidence: s.confidence,
    risk: s.riskLevel,
  }));

  const stressChartData = [
    { name: 'Low', count: stressDistribution.LOW || 0 },
    { name: 'Moderate', count: stressDistribution.MODERATE || 0 },
    { name: 'Elevated', count: stressDistribution.ELEVATED || 0 },
    { name: 'High', count: stressDistribution.HIGH || 0 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Patient Access Error */}
      {patientError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-surface-900">Patient Access Restricted</h2>
          <p className="text-sm text-surface-600 max-w-md mx-auto">
            {patientError}
          </p>
          <button
            onClick={() => navigate('/doctor/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-clinical-600 text-white rounded-xl text-xs font-semibold hover:bg-clinical-700 shadow-clinical"
          >
            Return to Command Center
          </button>
        </div>
      )}

      {/* Doctor Patient Selection Banner */}
      {isDoctor && selectedPatient && !patientError && (
        <div className="bg-clinical-50/60 border border-clinical-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-clinical-100 flex items-center justify-center text-clinical-700">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-surface-900">{selectedPatient.user?.name || 'Patient Record'}</h3>
                <span className="text-[10px] font-semibold text-clinical-700 bg-white px-2 py-0.5 rounded-full border border-clinical-200">
                  ID: {selectedPatient.id.slice(0, 8)}...
                </span>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">
                Blood Group: {selectedPatient.bloodGroup || 'Not specified'} • Gender: {selectedPatient.gender || 'Not specified'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/doctor/dashboard')}
              className="text-xs px-3 py-1.5 font-medium text-surface-700 hover:text-surface-900 bg-white border border-surface-200 rounded-lg hover:bg-surface-50"
            >
              Return to Command Center
            </button>
          </div>
        </div>
      )}

      {/* Empty State when doctor has no patient context */}
      {isDoctor && (!patientIdParam || requiresPatientSelection) && !patientError ? (
        <EmptyState
          icon={<Brain className="w-10 h-10 text-clinical-500" />}
          title="Select Patient to View Clinical Decision Support"
          description="Select a patient from your appointment schedule or patient dossier to view their longitudinal rPPG screenings and Gemini AI analysis."
          actionText="Return to Command Center"
          onAction={() => navigate('/doctor/dashboard')}
        />
      ) : !patientError && (
        <>
          {/* Title & Time Range Filter */}
          <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-clinical-600 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200">
                {isDoctor ? 'Physician Decision Support System' : 'Gemini-Powered Clinical Decision Support'}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-surface-900 mt-1">
                {t('nav_analysis')}
              </h1>
              <p className="text-xs text-surface-500 mt-0.5">
                {isDoctor
                  ? 'Longitudinal contactless hemodynamic trends, risk stratifications, and Gemini AI clinical observations.'
                  : 'Structured hemodynamic trends and decision support derived from real contactless screenings.'}
              </p>
            </div>

            {/* Time Filter Buttons */}
            <div className="inline-flex p-1 bg-surface-100 rounded-xl border border-surface-200 self-start sm:self-auto">
              {(['7', '30', '90', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    timeRange === range
                      ? 'bg-white text-clinical-700 shadow-subtle border border-surface-200'
                      : 'text-surface-600 hover:text-surface-900'
                  }`}
                >
                  {range === 'all' ? 'All Time' : `${range} Days`}
                </button>
              ))}
            </div>
          </div>

          <MedicalDisclaimer />

          {loading ? (
            <div className="h-64 bg-surface-100 rounded-2xl animate-pulse" />
          ) : totalScans === 0 ? (
            <div className="bg-white border border-surface-200 rounded-2xl p-8 shadow-subtle text-center max-w-xl mx-auto space-y-5">
              <div className="w-14 h-14 mx-auto rounded-full bg-clinical-50 flex items-center justify-center text-clinical-600 border border-clinical-100">
                <HeartPulse className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-surface-900">
                  {isDoctor ? 'No Screening Records for This Patient' : 'No Screening Records in This Timeframe'}
                </h3>
                <p className="text-xs text-surface-500 mt-1 max-w-md mx-auto">
                  {isDoctor
                    ? 'This patient has not yet completed any contactless face screenings in this timeframe.'
                    : 'Complete your first contactless face screening to unlock longitudinal trend graphs and Gemini-powered decision support.'}
                </p>
              </div>

              {!isDoctor && (
                <>
                  <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 text-left space-y-2.5">
                    <span className="text-xs font-bold text-surface-800 uppercase tracking-wider block">
                      What you will see here:
                    </span>
                    <ul className="text-xs text-surface-600 space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-clinical-600 shrink-0" />
                        <span>Estimated Heart Rate trends and baseline variations over time</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-clinical-600 shrink-0" />
                        <span>Heart Rate Variability (HRV RMSSD) stress distribution patterns</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-clinical-600 shrink-0" />
                        <span>Gemini-powered clinical observations, trends, and risk context</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-clinical-600 shrink-0" />
                        <span>Photoplethysmographic signal reliability and optical quality scores</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => navigate('/scan')}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-clinical-600 hover:bg-clinical-700 text-white text-xs font-semibold rounded-xl shadow-clinical transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Start Face Screening</span>
                  </button>
                </>
              )}

              {isDoctor && (
                <button
                  onClick={() => navigate('/doctor/dashboard')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-clinical-600 hover:bg-clinical-700 text-white text-xs font-semibold rounded-xl shadow-clinical transition-all"
                >
                  <span>Return to Command Center</span>
                </button>
              )}
            </div>
          ) : (
        <div className="space-y-6">
          {/* Screening Overview Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-surface-200 rounded-xl p-4 shadow-subtle">
              <span className="text-[10px] font-bold text-surface-500 uppercase tracking-wider block">
                Total Screenings
              </span>
              <span className="text-2xl font-bold text-surface-900 mt-1 block">
                {totalScans}
              </span>
              <span className="text-[11px] text-surface-400 mt-0.5 block">Stored records</span>
            </div>

            <div className="bg-white border border-surface-200 rounded-xl p-4 shadow-subtle">
              <span className="text-[10px] font-bold text-surface-500 uppercase tracking-wider block">
                Average Est. HR
              </span>
              <span className="text-2xl font-bold text-clinical-600 mt-1 block">
                {chartData.length > 0
                  ? Math.round(
                      (chartData.reduce((acc: number, c: any) => acc + c.hr, 0) / chartData.length) * 10
                    ) / 10
                  : '—'}
                <span className="text-xs text-surface-500 ml-1 font-semibold">BPM</span>
              </span>
              <span className="text-[11px] text-surface-400 mt-0.5 block">Across window</span>
            </div>

            <div className="bg-white border border-surface-200 rounded-xl p-4 shadow-subtle">
              <span className="text-[10px] font-bold text-surface-500 uppercase tracking-wider block">
                Avg. Confidence
              </span>
              <span className="text-2xl font-bold text-surface-900 mt-1 block">
                {chartData.length > 0
                  ? Math.round(
                      chartData.reduce((acc: number, c: any) => acc + c.confidence, 0) / chartData.length
                    )
                  : '—'}%
              </span>
              <span className="text-[11px] text-surface-400 mt-0.5 block">Signal reliability</span>
            </div>

            <div className="bg-white border border-surface-200 rounded-xl p-4 shadow-subtle">
              <span className="text-[10px] font-bold text-surface-500 uppercase tracking-wider block">
                Latest Scan
              </span>
              <span className="text-sm font-bold text-surface-900 mt-2 block truncate">
                {chartData.length > 0 ? chartData[chartData.length - 1].date : '—'}
              </span>
              <span className="text-[11px] text-surface-400 mt-0.5 block">Most recent session</span>
            </div>
          </div>

          {/* Gemini AI Decision Support Summary Card */}
          {aiSummary && (
            <div className="bg-white border border-clinical-200 rounded-2xl p-6 shadow-clinical space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-surface-100">
                <div className="flex items-center gap-2 text-clinical-800">
                  <Sparkles className="w-5 h-5 text-clinical-600" />
                  <h2 className="text-sm font-bold uppercase tracking-wider">
                    Gemini AI Clinical Decision Support
                  </h2>
                </div>
                <span className="text-[10px] text-clinical-600 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200 font-semibold">
                  Evaluated On Real Scans
                </span>
              </div>

              <div className="p-4 bg-clinical-50/50 rounded-xl border border-clinical-100 text-sm text-surface-800 leading-relaxed font-normal">
                {aiSummary.summary}
              </div>

              {/* Structured Decision Support Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {aiSummary.trend && (
                  <div className="p-3.5 bg-surface-50 border border-surface-200 rounded-xl">
                    <span className="text-[10px] font-bold text-surface-600 uppercase tracking-wider block mb-1">
                      Longitudinal Trend Context
                    </span>
                    <p className="text-xs text-surface-700 leading-relaxed">
                      {aiSummary.trend}
                    </p>
                  </div>
                )}

                {aiSummary.riskContext && (
                  <div className="p-3.5 bg-surface-50 border border-surface-200 rounded-xl">
                    <span className="text-[10px] font-bold text-surface-600 uppercase tracking-wider block mb-1">
                      Screening Pattern Risk Context
                    </span>
                    <p className="text-xs text-surface-700 leading-relaxed">
                      {aiSummary.riskContext}
                    </p>
                  </div>
                )}

                {aiSummary.recommendedNextStep && (
                  <div className="p-3.5 bg-surface-50 border border-surface-200 rounded-xl">
                    <span className="text-[10px] font-bold text-surface-600 uppercase tracking-wider block mb-1">
                      Recommended Next Step
                    </span>
                    <p className="text-xs text-surface-700 leading-relaxed">
                      {aiSummary.recommendedNextStep}
                    </p>
                  </div>
                )}

                {aiSummary.limitations && (
                  <div className="p-3.5 bg-surface-50 border border-surface-200 rounded-xl">
                    <span className="text-[10px] font-bold text-surface-600 uppercase tracking-wider block mb-1">
                      Sensor & Optical Limitations
                    </span>
                    <p className="text-xs text-surface-700 leading-relaxed">
                      {aiSummary.limitations}
                    </p>
                  </div>
                )}
              </div>

              {aiSummary.observations && aiSummary.observations.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-surface-700 uppercase tracking-wider mb-2">
                    Key Clinical Observations
                  </h4>
                  <ul className="space-y-1.5">
                    {aiSummary.observations.map((obs: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-surface-600">
                        <CheckCircle2 className="w-4 h-4 text-clinical-600 shrink-0 mt-0.5" />
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Heart Rate Trend Line Chart (8 cols) */}
            <div className="lg:col-span-8 bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-clinical-600" />
                  <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
                    Estimated Heart Rate Trend (BPM)
                  </h3>
                </div>
                <span className="text-[11px] text-surface-500">{totalScans} Screenings</span>
              </div>

              {totalScans === 1 ? (
                <div className="h-64 w-full flex flex-col items-center justify-center bg-surface-50 rounded-xl border border-surface-100 p-6 text-center space-y-2">
                  <HeartPulse className="w-8 h-8 text-clinical-600" />
                  <span className="text-sm font-bold text-surface-800">
                    Single Baseline Screening Recorded ({chartData[0]?.hr} BPM)
                  </span>
                  <p className="text-xs text-surface-500 max-w-sm">
                    Complete additional screenings over multiple days or weeks to generate longitudinal trend lines.
                  </p>
                  <button
                    onClick={() => navigate('/scan')}
                    className="mt-2 text-xs font-semibold text-clinical-600 hover:text-clinical-700 underline"
                  >
                    Take another screening &rarr;
                  </button>
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis
                        domain={[40, 160]}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        unit=" bpm"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.5rem',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="hr"
                        stroke="#0d9488"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#0d9488' }}
                        activeDot={{ r: 6 }}
                        name="Estimated HR"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Stress Distribution Bar Chart (4 cols) */}
            <div className="lg:col-span-4 bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle space-y-4">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-clinical-600" />
                <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
                  Stress Distribution
                </h3>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stressChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Sessions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
