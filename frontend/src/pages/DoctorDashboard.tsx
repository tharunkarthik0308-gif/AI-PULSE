import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Calendar,
  AlertTriangle,
  Users,
  Video,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Search,
  FileText,
  HeartPulse,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { MetricCard } from '../components/common/MetricCard';
import { MedicalDisclaimer } from '../components/common/MedicalDisclaimer';
import { EmptyState } from '../components/common/EmptyState';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      const res = await api.getDoctorDashboard();
      if (res.success) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('Error fetching doctor dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
  }, []);

  const handleUpdateStatus = async (appointmentId: string, status: string) => {
    try {
      await api.updateAppointmentStatus(appointmentId, status);
      fetchDoctorData();
    } catch (err) {
      console.error('Error updating status:', err);
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
    doctor,
    stats = {},
    todaysAppointments = [],
    pendingAppointments = [],
    highRiskScans = [],
    recentPatientScans = [],
    patientQueue = [],
  } = dashboardData || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Command Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-surface-200 p-6 rounded-2xl shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Clinical Command Center
            </span>
            {doctor?.clinicHospital && (
              <span className="text-xs text-surface-500">• {doctor.clinicHospital}</span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 mt-1">
            {user?.name}
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            Specialty: {doctor?.specialty || 'Specialty not provided'} | Experience:{' '}
            {doctor?.experienceYears ? `${doctor.experienceYears} Years` : 'Experience not provided'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/doctor/patients"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-clinical-700 bg-clinical-50 hover:bg-clinical-100 border border-clinical-200 rounded-xl transition-colors shadow-2xs"
          >
            <Users className="w-4 h-4" />
            <span>Patient Directory</span>
          </Link>
          <Link
            to="/appointments"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-xl shadow-clinical transition-colors"
          >
            <Calendar className="w-4 h-4" />
            <span>Manage Schedule</span>
          </Link>
        </div>
      </div>

      {/* Prominent Medical Safety Banner */}
      <MedicalDisclaimer />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Patient Cohort"
          value={stats.totalPatients || 0}
          unit="Patients"
          sublabel="Under current clinical care"
          statusBadge={{ text: 'Verified', variant: 'success' }}
          icon={<Users className="w-5 h-5 text-clinical-600" />}
        />

        <MetricCard
          title="Today's Consultations"
          value={stats.todayAppointmentsCount || 0}
          unit="Scheduled"
          sublabel="Video & Telehealth"
          statusBadge={{
            text: stats.todayAppointmentsCount > 0 ? 'Active' : 'Clear',
            variant: stats.todayAppointmentsCount > 0 ? 'info' : 'neutral',
          }}
          icon={<Calendar className="w-5 h-5 text-clinical-600" />}
        />

        <MetricCard
          title="Pending Booking Requests"
          value={stats.pendingRequestsCount || 0}
          unit="Requests"
          sublabel="Awaiting doctor approval"
          statusBadge={{
            text: stats.pendingRequestsCount > 0 ? 'Action Required' : 'Up to Date',
            variant: stats.pendingRequestsCount > 0 ? 'warning' : 'success',
          }}
          icon={<Clock className="w-5 h-5 text-clinical-600" />}
        />

        <MetricCard
          title="Screening Pattern Alerts"
          value={stats.highRiskAlertsCount || 0}
          unit="Alerts"
          sublabel="High-risk rPPG sessions"
          statusBadge={{
            text: stats.highRiskAlertsCount > 0 ? 'Review Needed' : 'Normal',
            variant: stats.highRiskAlertsCount > 0 ? 'danger' : 'success',
          }}
          icon={<ShieldAlert className="w-5 h-5 text-rose-600" />}
        />
      </div>

      {/* High-Risk Screening Alerts Section */}
      <div className="bg-white border border-rose-200 rounded-2xl p-6 shadow-subtle">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-rose-800">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Screening Pattern Alerts — Professional Review Recommended
            </h2>
          </div>
          <span className="text-xs text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 font-semibold">
            {highRiskScans.length} Flagged
          </span>
        </div>

        {highRiskScans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {highRiskScans.map((scan: any) => (
              <div
                key={scan.id}
                className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl flex items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-surface-900">
                      {scan.patient?.user?.name || 'Patient'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-rose-100 text-rose-800">
                      {scan.riskLevel}
                    </span>
                  </div>

                  <p className="text-xs text-surface-600 mt-1">
                    Estimated HR: <span className="font-bold text-surface-900">{scan.estimatedHeartRate} BPM</span> • Stress: {scan.stressLevel}
                  </p>
                  <p className="text-[11px] text-surface-500 mt-0.5">
                    Signal Quality: {scan.signalQuality}% • Recorded: {new Date(scan.timestamp).toLocaleString()}
                  </p>
                </div>

                <Link
                  to={`/doctor/patients/${scan.patientId}`}
                  className="shrink-0 px-3 py-1.5 text-xs font-semibold text-clinical-700 bg-white hover:bg-clinical-50 border border-clinical-300 rounded-lg shadow-2xs transition-colors"
                >
                  Open Dossier
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-surface-500 text-center py-4">
            No high-risk screening patterns currently detected across your patients.
          </p>
        )}
      </div>

      {/* Main Two-Column View: Today's Schedule & Pending Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-clinical-600" />
              <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
                Today's Consultations
              </h2>
            </div>
            <span className="text-xs text-surface-500">
              {todaysAppointments.length} Booked
            </span>
          </div>

          {todaysAppointments.length > 0 ? (
            <div className="space-y-3">
              {todaysAppointments.map((appt: any) => (
                <div
                  key={appt.id}
                  className="p-4 bg-surface-50 border border-surface-200 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-semibold text-xs text-surface-900">
                      {appt.patient?.user?.name}
                    </h4>
                    <p className="text-[11px] text-surface-500">
                      {appt.startTime} - {appt.endTime} • {appt.type}
                    </p>
                    {appt.reason && (
                      <p className="text-[11px] text-surface-600 mt-1 italic">
                        "{appt.reason}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/consultation/${appt.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-subtle transition-colors"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Start Call</span>
                    </Link>
                    <Link
                      to={`/doctor/patients/${appt.patientId}`}
                      className="px-2.5 py-1.5 text-xs text-surface-700 bg-white border border-surface-200 rounded-lg hover:bg-surface-50"
                    >
                      Dossier
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Calendar className="w-6 h-6" />}
              title="No consultations scheduled today"
              description="Your consultation schedule for today is completely clear."
            />
          )}
        </div>

        {/* Pending Requests Queue */}
        <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-clinical-600" />
              <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
                Appointment Requests Queue
              </h2>
            </div>
            <span className="text-xs text-surface-500">
              {pendingAppointments.length} Awaiting
            </span>
          </div>

          {pendingAppointments.length > 0 ? (
            <div className="space-y-3">
              {pendingAppointments.map((req: any) => (
                <div
                  key={req.id}
                  className="p-4 bg-surface-50 border border-surface-200 rounded-xl space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-xs text-surface-900">
                        {req.patient?.user?.name}
                      </h4>
                      <p className="text-[11px] text-surface-500">
                        Requested: {req.appointmentDate} at {req.startTime} ({req.type})
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Pending
                    </span>
                  </div>

                  {req.reason && (
                    <p className="text-xs text-surface-600 bg-white p-2 rounded border border-surface-200">
                      {req.reason}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'REJECTED')}
                      className="px-3 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'CONFIRMED')}
                      className="px-3 py-1 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-subtle transition-colors"
                    >
                      Accept & Confirm
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Clock className="w-6 h-6" />}
              title="No pending requests"
              description="All patient booking requests have been reviewed."
            />
          )}
        </div>
      </div>

      {/* Confirmed Patient Queue */}
      <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-clinical-600" />
            <div>
              <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
                Confirmed Patient Queue
              </h2>
              <p className="text-xs text-surface-500">
                Patients with scheduled consultations and their pre-call hemodynamic status
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-clinical-700 bg-clinical-50 px-2.5 py-0.5 rounded-full border border-clinical-200">
              {patientQueue.length} In Queue
            </span>
            <Link
              to="/doctor/patients"
              className="text-xs font-semibold text-clinical-600 hover:text-clinical-800 ml-1"
            >
              View Full Directory &rarr;
            </Link>
          </div>
        </div>

        {patientQueue.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patientQueue.map((item: any) => {
              const latestScan = item.patient?.scans?.[0];
              return (
                <div
                  key={item.id}
                  className="bg-surface-50/70 border border-surface-200 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-surface-300 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-surface-900">
                          {item.patient?.user?.name || 'Patient'}
                        </h4>
                        <p className="text-[11px] text-surface-500 mt-0.5">
                          {item.appointmentDate} at {item.startTime} • {item.type}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Confirmed
                      </span>
                    </div>

                    {item.reason && (
                      <p className="text-xs text-surface-600 mt-2 line-clamp-1 italic">
                        "{item.reason}"
                      </p>
                    )}

                    {/* Screening Vitals Badge */}
                    <div className="mt-3 pt-2.5 border-t border-surface-200/80 flex items-center justify-between text-[11px]">
                      <span className="text-surface-500 font-medium">Pre-Call Vitals:</span>
                      {latestScan ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-surface-900">
                            {latestScan.estimatedHeartRate} BPM
                          </span>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                              latestScan.riskLevel === 'NORMAL'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {latestScan.riskLevel}
                          </span>
                        </div>
                      ) : (
                        <span className="text-surface-400 italic text-[10px]">No scan on file</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-surface-200/60">
                    <Link
                      to={`/consultation/${item.id}`}
                      className="flex-1 text-center py-1.5 px-2 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-2xs transition-colors"
                    >
                      Join Call
                    </Link>
                    <Link
                      to={`/doctor/patients/${item.patientId}`}
                      className="py-1.5 px-3 text-xs font-semibold text-surface-700 bg-white hover:bg-surface-100 border border-surface-200 rounded-lg transition-colors"
                    >
                      Dossier
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="No upcoming patients in queue"
            description="Patients with confirmed consultations scheduled for upcoming dates will appear here automatically."
          />
        )}
      </div>

      {/* Recent Patient Screening Feed */}
      <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-clinical-600" />
            <div>
              <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
                Patient Screening Activity Feed
              </h2>
              <p className="text-xs text-surface-500">
                Live contactless hemodynamic measurements submitted by patients in your clinical cohort
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-surface-600 bg-surface-100 px-2.5 py-0.5 rounded-full border border-surface-200">
            {recentPatientScans.length} Recorded Sessions
          </span>
        </div>

        {recentPatientScans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentPatientScans.map((scan: any) => (
              <div
                key={scan.id}
                className="p-4 bg-surface-50/70 border border-surface-200 rounded-xl flex items-center justify-between gap-3 hover:border-surface-300 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-surface-900">
                      {scan.patient?.user?.name || 'Patient'}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                        scan.riskLevel === 'NORMAL'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {scan.riskLevel}
                    </span>
                  </div>
                  <p className="text-xs text-surface-600 mt-1">
                    Est. HR: <span className="font-bold text-surface-900">{scan.estimatedHeartRate} BPM</span> • Stress: {scan.stressLevel}
                  </p>
                  <p className="text-[11px] text-surface-400 mt-0.5">
                    Signal Quality: {scan.signalQuality}% • {new Date(scan.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    to={`/analysis?patientId=${scan.patientId}`}
                    className="px-2.5 py-1.5 text-xs text-surface-700 bg-white hover:bg-surface-100 border border-surface-200 rounded-lg transition-colors"
                  >
                    Analysis
                  </Link>
                  <Link
                    to={`/doctor/patients/${scan.patientId}`}
                    className="px-2.5 py-1.5 text-xs font-semibold text-clinical-700 bg-clinical-50 hover:bg-clinical-100 border border-clinical-200 rounded-lg transition-colors"
                  >
                    Dossier
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<HeartPulse className="w-6 h-6" />}
            title="No patient screenings recorded yet"
            description="When patients under your care complete contactless face screenings, their measurements will appear here."
          />
        )}
      </div>
    </div>
  );
};
