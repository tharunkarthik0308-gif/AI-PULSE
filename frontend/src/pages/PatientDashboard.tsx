import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Camera,
  HeartPulse,
  TrendingUp,
  Mic,
  Calendar,
  Pill,
  FileText,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Video,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { MedicalDisclaimer } from '../components/common/MedicalDisclaimer';
import { MetricCard } from '../components/common/MetricCard';
import { EmptyState } from '../components/common/EmptyState';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getPatientDashboard();
      if (res.success) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('Error fetching patient dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleTakeDose = async (medicationId: string, time: string) => {
    try {
      await api.logDose({
        medicationId,
        scheduledTime: time,
        status: 'TAKEN',
      });
      fetchDashboard();
    } catch (err) {
      console.error('Error logging dose:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-8 bg-surface-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-surface-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const {
    profile,
    latestScan,
    upcomingAppointment,
    activeMedications = [],
    adherenceRate,
    recentPrescription,
    recentReports = [],
  } = dashboardData || {};

  // Real database-driven Onboarding Progress Calculation
  const isProfileComplete = Boolean(profile?.phone || profile?.dateOfBirth);
  const isScreeningComplete = Boolean(latestScan);
  const isDoctorConnected = Boolean(upcomingAppointment);
  const isMedicationAdded = Boolean(activeMedications && activeMedications.length > 0);

  const completedStepsCount = [
    isProfileComplete,
    isScreeningComplete,
    isDoctorConnected,
    isMedicationAdded,
  ].filter(Boolean).length;
  const isAllComplete = completedStepsCount === 4;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-surface-200 p-6 rounded-2xl shadow-subtle">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-clinical-600 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200">
            Patient Portal
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 mt-1">
            Welcome back, {user?.name}
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            Your real-time physiological screening trends and connected telemedicine care team.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/scan"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-xl shadow-clinical transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span>Start Face Screening</span>
          </Link>
          <Link
            to="/triage"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-surface-700 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-xl transition-colors"
          >
            <Mic className="w-4 h-4 text-clinical-600" />
            <span>Voice Triage</span>
          </Link>
        </div>
      </div>

      {/* Prominent Medical Safety Banner */}
      <MedicalDisclaimer />

      {/* First-Time Patient Onboarding Card */}
      <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-subtle space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-surface-900">
                Complete Your Health Setup
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isAllComplete
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-clinical-50 text-clinical-700 border border-clinical-200'
                }`}
              >
                {isAllComplete ? 'Health setup complete ✓' : `${completedStepsCount} / 4 completed`}
              </span>
            </div>
            <p className="text-xs text-surface-500 mt-0.5">
              Follow these recommended preliminary steps to unlock full AI health insights and continuous telemedicine care.
            </p>
          </div>

          <div className="w-full sm:w-36 bg-surface-100 h-2 rounded-full overflow-hidden self-center">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isAllComplete ? 'bg-emerald-500' : 'bg-clinical-600'
              }`}
              style={{ width: `${(completedStepsCount / 4) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Step 1: Complete Profile */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
              isProfileComplete
                ? 'bg-emerald-50/50 border-emerald-200'
                : 'bg-surface-50 border-surface-200 hover:border-clinical-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isProfileComplete
                    ? 'bg-emerald-600 text-white'
                    : 'bg-surface-200 text-surface-700'
                }`}
              >
                {isProfileComplete ? '✓' : '1'}
              </span>
              <div>
                <p className="text-xs font-semibold text-surface-900">Complete Profile</p>
                <p className="text-[11px] text-surface-500">
                  {isProfileComplete ? 'Profile active' : 'Add phone & DOB'}
                </p>
              </div>
            </div>
            {!isProfileComplete && (
              <span className="text-[11px] font-semibold text-clinical-600">Pending</span>
            )}
          </div>

          {/* Step 2: First Face Screening */}
          <Link
            to="/scan"
            className={`p-3 rounded-xl border flex items-center justify-between transition-colors group ${
              isScreeningComplete
                ? 'bg-emerald-50/50 border-emerald-200'
                : 'bg-surface-50 border-surface-200 hover:border-clinical-400 hover:bg-clinical-50/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isScreeningComplete
                    ? 'bg-emerald-600 text-white'
                    : 'bg-clinical-600 text-white'
                }`}
              >
                {isScreeningComplete ? '✓' : '2'}
              </span>
              <div>
                <p className="text-xs font-semibold text-surface-900 group-hover:text-clinical-700">
                  First Face Screening
                </p>
                <p className="text-[11px] text-surface-500">
                  {isScreeningComplete
                    ? `${latestScan.estimatedHeartRate} BPM baseline`
                    : 'Record 30-sec rPPG'}
                </p>
              </div>
            </div>
            {!isScreeningComplete && (
              <span className="text-[11px] font-semibold text-clinical-600 group-hover:underline">
                Start →
              </span>
            )}
          </Link>

          {/* Step 3: Find Doctor */}
          <Link
            to="/appointments?tab=book"
            className={`p-3 rounded-xl border flex items-center justify-between transition-colors group ${
              isDoctorConnected
                ? 'bg-emerald-50/50 border-emerald-200'
                : 'bg-surface-50 border-surface-200 hover:border-clinical-400 hover:bg-clinical-50/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isDoctorConnected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-surface-200 text-surface-700'
                }`}
              >
                {isDoctorConnected ? '✓' : '3'}
              </span>
              <div>
                <p className="text-xs font-semibold text-surface-900 group-hover:text-clinical-700">
                  Find Doctor
                </p>
                <p className="text-[11px] text-surface-500">
                  {isDoctorConnected ? 'Consultation booked' : 'Browse clinicians'}
                </p>
              </div>
            </div>
            {!isDoctorConnected && (
              <span className="text-[11px] font-semibold text-clinical-600 group-hover:underline">
                Find →
              </span>
            )}
          </Link>

          {/* Step 4: Add Medications */}
          <Link
            to="/medications"
            className={`p-3 rounded-xl border flex items-center justify-between transition-colors group ${
              isMedicationAdded
                ? 'bg-emerald-50/50 border-emerald-200'
                : 'bg-surface-50 border-surface-200 hover:border-clinical-400 hover:bg-clinical-50/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isMedicationAdded
                    ? 'bg-emerald-600 text-white'
                    : 'bg-surface-200 text-surface-700'
                }`}
              >
                {isMedicationAdded ? '✓' : '4'}
              </span>
              <div>
                <p className="text-xs font-semibold text-surface-900 group-hover:text-clinical-700">
                  Add Medications
                </p>
                <p className="text-[11px] text-surface-500">
                  {isMedicationAdded
                    ? `${activeMedications.length} active item(s)`
                    : 'Track adherence'}
                </p>
              </div>
            </div>
            {!isMedicationAdded && (
              <span className="text-[11px] font-semibold text-clinical-600 group-hover:underline">
                Add →
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('scan_metric_hr')}
          value={latestScan ? `${latestScan.estimatedHeartRate}` : '—'}
          unit={latestScan ? 'BPM' : ''}
          sublabel={
            latestScan
              ? `Recorded ${new Date(latestScan.timestamp).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                })}`
              : 'No screening recorded'
          }
          actionLink={
            !latestScan
              ? { label: 'Start your first screening →', to: '/scan' }
              : undefined
          }
          statusBadge={
            latestScan
              ? {
                  text: latestScan.riskLevel,
                  variant:
                    latestScan.riskLevel === 'NORMAL'
                      ? 'success'
                      : latestScan.riskLevel === 'HIGH_RISK'
                      ? 'danger'
                      : 'warning',
                }
              : undefined
          }
          icon={<HeartPulse className="w-5 h-5 text-clinical-600" />}
        />

        <MetricCard
          title={t('scan_metric_stress')}
          value={latestScan ? latestScan.stressLevel : '—'}
          sublabel={latestScan ? `Signal confidence: ${latestScan.confidence}%` : 'No screening data yet'}
          actionLink={
            !latestScan
              ? { label: 'Start a screening →', to: '/scan' }
              : undefined
          }
          statusBadge={
            latestScan
              ? {
                  text: `${latestScan.signalQuality}% Quality`,
                  variant: latestScan.signalQuality > 60 ? 'info' : 'neutral',
                }
              : undefined
          }
          icon={<TrendingUp className="w-5 h-5 text-clinical-600" />}
        />

        <MetricCard
          title={t('dash_adherence_rate')}
          value={adherenceRate !== null && adherenceRate !== undefined ? `${adherenceRate}%` : '—'}
          sublabel={
            adherenceRate !== null && adherenceRate !== undefined
              ? 'Based on 30-day medication logs'
              : 'No medication schedule'
          }
          actionLink={
            adherenceRate === null || adherenceRate === undefined
              ? { label: 'Add medication →', to: '/medications' }
              : undefined
          }
          statusBadge={
            adherenceRate !== null && adherenceRate !== undefined
              ? {
                  text: adherenceRate >= 80 ? 'Optimal' : 'Needs Attention',
                  variant: adherenceRate >= 80 ? 'success' : 'warning',
                }
              : undefined
          }
          icon={<Pill className="w-5 h-5 text-clinical-600" />}
        />

        <MetricCard
          title="Telemedicine Status"
          value={upcomingAppointment ? upcomingAppointment.status : 'None'}
          sublabel={
            upcomingAppointment
              ? `${upcomingAppointment.appointmentDate} at ${upcomingAppointment.startTime}`
              : 'No upcoming appointment'
          }
          actionLink={
            !upcomingAppointment
              ? { label: 'Find a doctor →', to: '/appointments?tab=book' }
              : undefined
          }
          statusBadge={
            upcomingAppointment
              ? {
                  text: upcomingAppointment.type,
                  variant: upcomingAppointment.status === 'CONFIRMED' ? 'success' : 'info',
                }
              : undefined
          }
          icon={<Calendar className="w-5 h-5 text-clinical-600" />}
        />
      </div>

      {/* Middle Row: Upcoming Appointment & Today's Medications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Telemedicine Card */}
        <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-clinical-600" />
                <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
                  {t('dash_upcoming_appointment')}
                </h2>
              </div>
              <Link
                to="/appointments"
                className="text-xs font-semibold text-clinical-600 hover:text-clinical-800"
              >
                View all
              </Link>
            </div>

            {upcomingAppointment ? (
              <div className="p-4 bg-surface-50 border border-surface-200 rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-surface-900">
                      {upcomingAppointment.doctor?.user?.name}
                    </h3>
                    <p className="text-xs text-surface-500">
                      {upcomingAppointment.doctor?.specialty}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                    {upcomingAppointment.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-surface-600 pt-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-surface-400" />
                    <span>
                      {upcomingAppointment.appointmentDate} • {upcomingAppointment.startTime} -{' '}
                      {upcomingAppointment.endTime}
                    </span>
                  </div>
                  <span className="uppercase text-[10px] font-bold text-clinical-700 bg-clinical-50 px-1.5 py-0.5 rounded">
                    {upcomingAppointment.type}
                  </span>
                </div>

                {upcomingAppointment.reason && (
                  <p className="text-xs text-surface-600 bg-white p-2.5 rounded-lg border border-surface-200">
                    <span className="font-medium text-surface-700">Reason: </span>
                    {upcomingAppointment.reason}
                  </p>
                )}

                <div className="pt-2 flex items-center gap-2">
                  {upcomingAppointment.status === 'CONFIRMED' && (
                    <Link
                      to={`/consultation/${upcomingAppointment.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-subtle transition-colors"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>{t('btn_join_video')}</span>
                    </Link>
                  )}
                  <Link
                    to="/chat"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-surface-700 bg-white hover:bg-surface-50 border border-surface-200 rounded-lg transition-colors"
                  >
                    <span>Message Doctor</span>
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<Calendar className="w-6 h-6" />}
                title={t('dash_no_appointments')}
                description="Browse board-certified doctors and schedule a video consultation at your preferred time."
                actionText="Schedule Consultation"
                onAction={() => navigate('/appointments')}
              />
            )}
          </div>
        </div>

        {/* Active Medications & Adherence Schedule */}
        <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-clinical-600" />
                <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
                  {t('dash_active_meds')}
                </h2>
              </div>
              <Link
                to="/medications"
                className="text-xs font-semibold text-clinical-600 hover:text-clinical-800"
              >
                Manage
              </Link>
            </div>

            {activeMedications.length > 0 ? (
              <div className="space-y-3">
                {activeMedications.slice(0, 3).map((med: any) => {
                  const todayLog = med.logs && med.logs[0];
                  const isTaken = todayLog?.status === 'TAKEN';
                  return (
                    <div
                      key={med.id}
                      className="p-3.5 bg-surface-50 border border-surface-200 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <h4 className="font-semibold text-xs text-surface-900">
                          {med.name}
                        </h4>
                        <p className="text-[11px] text-surface-500 mt-0.5">
                          {med.dosage} • {med.frequency}
                        </p>
                      </div>

                      <div>
                        {isTaken ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Taken</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleTakeDose(med.id, '09:00')}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-clinical-700 bg-white hover:bg-clinical-50 border border-clinical-200 px-3 py-1 rounded-lg transition-colors shadow-2xs"
                          >
                            <span>Mark Taken</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={<Pill className="w-6 h-6" />}
                title="No active medications"
                description="Maintain an accurate record of prescribed medications to compute schedule adherence."
                actionText="Add Medication"
                onAction={() => navigate('/medications')}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Quick Clinical Actions & Recent Clinical Docs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Clinical Actions */}
        <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle lg:col-span-1">
          <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">
            {t('dash_quick_actions')}
          </h2>

          <div className="grid grid-cols-1 gap-2.5">
            <Link
              to="/scan"
              className="flex items-center justify-between p-3 rounded-xl border border-surface-200 hover:border-clinical-400 hover:bg-clinical-50/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-surface-900 group-hover:text-clinical-700">
                    Contactless Face Scan
                  </h4>
                  <p className="text-[11px] text-surface-500">Real-time webcam rPPG vitals</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-400 group-hover:text-clinical-600 transition-colors" />
            </Link>

            <Link
              to="/analysis"
              className="flex items-center justify-between p-3 rounded-xl border border-surface-200 hover:border-clinical-400 hover:bg-clinical-50/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-surface-900 group-hover:text-clinical-700">
                    AI Health Analysis
                  </h4>
                  <p className="text-[11px] text-surface-500">Trend charts & structured review</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-400 group-hover:text-clinical-600 transition-colors" />
            </Link>

            <Link
              to="/triage"
              className="flex items-center justify-between p-3 rounded-xl border border-surface-200 hover:border-clinical-400 hover:bg-clinical-50/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-surface-900 group-hover:text-clinical-700">
                    Multilingual Voice Triage
                  </h4>
                  <p className="text-[11px] text-surface-500">Tamil, Hindi & English speech</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-400 group-hover:text-clinical-600 transition-colors" />
            </Link>

            <Link
              to="/timeline"
              className="flex items-center justify-between p-3 rounded-xl border border-surface-200 hover:border-clinical-400 hover:bg-clinical-50/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-surface-900 group-hover:text-clinical-700">
                    Health Timeline
                  </h4>
                  <p className="text-[11px] text-surface-500">Aggregated clinical chronology</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-400 group-hover:text-clinical-600 transition-colors" />
            </Link>
          </div>
        </div>

        {/* Recent Reports & Prescriptions */}
        <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
              {t('dash_recent_reports')} & E-Prescriptions
            </h2>
            <Link
              to="/reports"
              className="text-xs font-semibold text-clinical-600 hover:text-clinical-800"
            >
              View all
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Prescription Preview */}
            <div className="border border-surface-200 rounded-xl p-4 bg-surface-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-clinical-700 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200">
                  Latest E-Prescription
                </span>
                {recentPrescription && (
                  <span className="text-[11px] text-surface-400">
                    {new Date(recentPrescription.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {recentPrescription ? (
                <div className="space-y-2 mt-2">
                  <p className="text-xs font-semibold text-surface-900">
                    Issued by Dr. {recentPrescription.doctor?.user?.name}
                  </p>
                  <p className="text-[11px] text-surface-500 line-clamp-2">
                    {recentPrescription.clinicalNotes || 'Prescription items issued.'}
                  </p>
                  <div className="pt-2">
                    <Link
                      to={`/prescriptions`}
                      className="text-xs font-semibold text-clinical-600 hover:text-clinical-800 inline-flex items-center gap-1"
                    >
                      <span>View Prescription Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-surface-400 py-6 text-center">
                  No prescriptions issued yet
                </p>
              )}
            </div>

            {/* Medical Reports Preview */}
            <div className="border border-surface-200 rounded-xl p-4 bg-surface-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-surface-600 bg-surface-100 px-2 py-0.5 rounded">
                  Clinical Documents
                </span>
              </div>

              {recentReports.length > 0 ? (
                <div className="divide-y divide-surface-100">
                  {recentReports.slice(0, 2).map((rep: any) => (
                    <div key={rep.id} className="py-2 first:pt-0 last:pb-0">
                      <p className="text-xs font-semibold text-surface-900 truncate">
                        {rep.title}
                      </p>
                      <p className="text-[10px] text-surface-400">
                        {rep.reportType} • {new Date(rep.reportDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Link
                      to="/reports"
                      className="text-xs font-semibold text-clinical-600 hover:text-clinical-800 inline-flex items-center gap-1"
                    >
                      <span>Upload & View Reports</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-surface-400 py-6 text-center">
                  No medical reports uploaded yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
