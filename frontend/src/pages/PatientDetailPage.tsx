import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  User,
  HeartPulse,
  TrendingUp,
  FileText,
  Calendar,
  Pill,
  Lock,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Mic,
  Video,
  MessageSquare,
  Download,
  Brain,
  ArrowLeft,
  XCircle,
  Activity,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MetricCard } from '../components/common/MetricCard';
import { MedicalDisclaimer } from '../components/common/MedicalDisclaimer';
import { EmptyState } from '../components/common/EmptyState';

export const PatientDetailPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<any | null>(null);
  const [adherenceData, setAdherenceData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'screenings' | 'medications' | 'prescriptions' | 'reports' | 'appointments' | 'triage' | 'notes'
  >('screenings');

  // Doctor note modal
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const fetchPatientDossier = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.getPatientById(patientId);
      if (res.success) {
        setPatient(res.patient);
        setAdherenceData(res.adherence || null);
      }
    } catch (err: any) {
      console.error('Error loading patient dossier:', err);
      setError(err.message || 'Error loading patient record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientDossier();
  }, [patientId]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle || !noteContent || !patientId) return;

    setSubmittingNote(true);
    try {
      await api.createDoctorNote({
        patientId,
        title: noteTitle,
        content: noteContent,
        isPrivate: true,
      });
      setShowNoteModal(false);
      setNoteTitle('');
      setNoteContent('');
      fetchPatientDossier();
    } catch (err) {
      console.error('Error creating private note:', err);
    } finally {
      setSubmittingNote(false);
    }
  };

  const calculateAge = (dobString?: string): string => {
    if (!dobString) return 'Not recorded';
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return dobString;
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return `${age} yrs (${dobString})`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center animate-pulse space-y-4">
        <div className="h-8 bg-surface-200 rounded w-1/3 mx-auto" />
        <div className="h-48 bg-surface-100 rounded-2xl max-w-4xl mx-auto" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-surface-900">Patient Access Restricted</h2>
        <p className="text-xs text-surface-600">
          {error || 'You do not have authorization to view this patient record.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/doctor/patients')}
            className="px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 text-xs font-semibold rounded-xl"
          >
            Patient Directory
          </button>
          <button
            onClick={() => navigate('/doctor/dashboard')}
            className="px-4 py-2 bg-clinical-600 hover:bg-clinical-700 text-white text-xs font-semibold rounded-xl shadow-clinical"
          >
            Command Center
          </button>
        </div>
      </div>
    );
  }

  const latestScan = patient.scans && patient.scans[0];
  const activeOrTodayAppt = patient.appointments?.find(
    (a: any) => a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS' || a.status === 'SCHEDULED'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-surface-500">
        <Link to="/doctor/dashboard" className="hover:text-clinical-700">
          Command Center
        </Link>
        <span>/</span>
        <Link to="/doctor/patients" className="hover:text-clinical-700">
          Patient Directory
        </Link>
        <span>/</span>
        <span className="font-semibold text-surface-900">{patient.user?.name}</span>
      </div>

      {/* Patient Header Dossier */}
      <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-clinical-50 border border-clinical-200 text-clinical-700 font-bold text-2xl flex items-center justify-center shrink-0">
            {patient.user?.name?.charAt(0) || 'P'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-surface-900">{patient.user?.name}</h1>
              <span className="text-[10px] font-semibold text-clinical-700 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200">
                Blood Group: {patient.bloodGroup || 'Not recorded'}
              </span>
              <span className="text-[10px] text-surface-400 font-mono">
                ID: {patient.id.slice(0, 8)}...
              </span>
            </div>

            <p className="text-xs text-surface-500 mt-1">
              Age/DOB: {calculateAge(patient.dateOfBirth)} • Gender: {patient.gender || 'Not specified'} • Phone: {patient.phone || 'None'} • Emergency: {patient.emergencyContact || 'None'}
            </p>

            {/* Badges for Allergies and Conditions */}
            <div className="flex flex-wrap gap-2 mt-2">
              {patient.allergies && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200">
                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                  Allergies: {patient.allergies}
                </span>
              )}
              {patient.medicalConditions && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  Conditions: {patient.medicalConditions}
                </span>
              )}
              {patient.preferredLanguage && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium text-surface-600 bg-surface-100">
                  Preferred Lang: {patient.preferredLanguage.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Clinical Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {activeOrTodayAppt && (
            <Link
              to={`/consultation/${activeOrTodayAppt.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-2xs transition-colors"
            >
              <Video className="w-4 h-4" />
              <span>Join Video Call</span>
            </Link>
          )}

          <Link
            to={`/prescriptions?patientId=${patient.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-xl shadow-clinical transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Issue E-Prescription</span>
          </Link>

          <Link
            to={`/analysis?patientId=${patient.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-surface-700 bg-white hover:bg-surface-50 border border-surface-200 rounded-xl transition-colors"
          >
            <Brain className="w-4 h-4 text-clinical-600" />
            <span>AI Health Analysis</span>
          </Link>

          <Link
            to="/chat"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-surface-700 bg-white hover:bg-surface-50 border border-surface-200 rounded-xl transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-clinical-600" />
            <span>Chat</span>
          </Link>

          <button
            onClick={() => setShowNoteModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-surface-700 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-xl transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-clinical-600" />
            <span>Private Note</span>
          </button>
        </div>
      </div>

      <MedicalDisclaimer />

      {/* Primary Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Latest Estimated HR"
          value={latestScan ? `${latestScan.estimatedHeartRate}` : '—'}
          unit={latestScan ? 'BPM' : ''}
          sublabel={latestScan ? `Recorded ${new Date(latestScan.timestamp).toLocaleDateString()}` : 'No scans on file'}
          statusBadge={
            latestScan
              ? {
                  text: latestScan.riskLevel,
                  variant: latestScan.riskLevel === 'NORMAL' ? 'success' : 'danger',
                }
              : undefined
          }
          icon={<HeartPulse className="w-5 h-5 text-clinical-600" />}
        />

        <MetricCard
          title="Signal Quality Index"
          value={latestScan ? `${latestScan.signalQuality}%` : '—'}
          sublabel={latestScan ? `Confidence: ${latestScan.confidence}%` : 'No rPPG data'}
          statusBadge={
            latestScan
              ? { text: latestScan.stressLevel, variant: 'info' }
              : undefined
          }
          icon={<TrendingUp className="w-5 h-5 text-clinical-600" />}
        />

        <MetricCard
          title="Medication Adherence"
          value={adherenceData?.rate !== null && adherenceData?.rate !== undefined ? `${adherenceData.rate}%` : '—'}
          sublabel="Past 30-day compliance"
          statusBadge={
            adherenceData?.rate !== null && adherenceData?.rate !== undefined
              ? {
                  text: adherenceData.rate >= 80 ? 'Compliant' : 'Sub-Optimal',
                  variant: adherenceData.rate >= 80 ? 'success' : 'warning',
                }
              : undefined
          }
          icon={<Pill className="w-5 h-5 text-clinical-600" />}
        />

        <MetricCard
          title="Total Face Screenings"
          value={patient.scans?.length || 0}
          unit="Sessions"
          sublabel="Stored in database"
          statusBadge={{ text: 'Verified', variant: 'neutral' }}
          icon={<FileText className="w-5 h-5 text-clinical-600" />}
        />
      </div>

      {/* Add Doctor Private Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-surface-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-surface-200 shadow-elevation max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-clinical-600" />
                <h3 className="text-base font-bold text-surface-900">Doctor-Only Clinical Note</h3>
              </div>
              <button onClick={() => setShowNoteModal(false)} className="text-surface-400 p-1">
                ✕
              </button>
            </div>

            <p className="text-[11px] text-surface-500 italic">
              Note: This entry is strictly private to physicians and will never be displayed on the patient portal.
            </p>

            <form onSubmit={handleCreateNote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                  Note Subject
                </label>
                <input
                  type="text"
                  required
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g. Hemodynamic follow-up review"
                  className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-lg focus:bg-white focus:border-clinical-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                  Clinical Impression / Progress Observations
                </label>
                <textarea
                  rows={4}
                  required
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Enter detailed physician impressions, differential evaluations, or treatment plan modifications..."
                  className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-lg focus:bg-white focus:border-clinical-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 text-xs text-surface-600 hover:bg-surface-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNote}
                  className="px-5 py-2 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-subtle disabled:opacity-50"
                >
                  {submittingNote ? 'Saving...' : 'Save Private Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clinical Dossier Tabs Header */}
      <div className="border-b border-surface-200">
        <nav className="flex space-x-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'screenings', label: 'Face Screenings', count: patient.scans?.length || 0, icon: <HeartPulse className="w-3.5 h-3.5" /> },
            { id: 'medications', label: 'Medications', count: patient.medications?.length || 0, icon: <Pill className="w-3.5 h-3.5" /> },
            { id: 'prescriptions', label: 'E-Prescriptions', count: patient.prescriptions?.length || 0, icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'reports', label: 'Medical Reports', count: patient.medicalReports?.length || 0, icon: <Download className="w-3.5 h-3.5" /> },
            { id: 'appointments', label: 'Consultations', count: patient.appointments?.length || 0, icon: <Calendar className="w-3.5 h-3.5" /> },
            { id: 'triage', label: 'Voice Triage', count: patient.voiceTriageSessions?.length || 0, icon: <Mic className="w-3.5 h-3.5" /> },
            { id: 'notes', label: 'Private Notes', count: patient.doctorNotes?.length || 0, icon: <Lock className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 font-semibold rounded-t-xl transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-clinical-600 text-clinical-700 bg-white shadow-2xs'
                  : 'border-transparent text-surface-500 hover:text-surface-800 hover:bg-surface-100'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === tab.id ? 'bg-clinical-100 text-clinical-800' : 'bg-surface-200 text-surface-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle min-h-[300px]">
        {/* Tab 1: Screenings */}
        {activeTab === 'screenings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-surface-900">Contactless Face Screenings</h3>
                <p className="text-xs text-surface-500">Longitudinal optical rPPG measurements and hemodynamic trends</p>
              </div>
              <Link
                to={`/analysis?patientId=${patient.id}`}
                className="text-xs font-semibold text-clinical-600 hover:text-clinical-800"
              >
                Open Full AI Analysis &rarr;
              </Link>
            </div>

            {patient.scans && patient.scans.length > 0 ? (
              <div className="divide-y divide-surface-100">
                {patient.scans.map((sc: any) => (
                  <div key={sc.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-surface-900">{sc.estimatedHeartRate} BPM</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                            sc.riskLevel === 'NORMAL'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {sc.riskLevel}
                        </span>
                        <span className="text-[10px] font-medium text-surface-500 bg-surface-100 px-2 py-0.5 rounded">
                          Stress: {sc.stressLevel}
                        </span>
                      </div>
                      <p className="text-xs text-surface-500 mt-1">
                        Signal Quality: {sc.signalQuality}% • Optical Confidence: {sc.confidence}%
                      </p>
                    </div>

                    <span className="text-xs text-surface-400">
                      {new Date(sc.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<HeartPulse className="w-8 h-8" />}
                title="No face screenings recorded"
                description="This patient has not yet completed any contactless webcam screenings."
              />
            )}
          </div>
        )}

        {/* Tab 2: Medications */}
        {activeTab === 'medications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-surface-900">Current Medications & Adherence</h3>
                <p className="text-xs text-surface-500">Self-reported intake and scheduled daily regimen</p>
              </div>
              <Link
                to={`/medications?patientId=${patient.id}`}
                className="text-xs font-semibold text-clinical-600 hover:text-clinical-800"
              >
                Inspect Adherence Logs &rarr;
              </Link>
            </div>

            {patient.medications && patient.medications.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patient.medications.map((med: any) => (
                  <div key={med.id} className="p-4 bg-surface-50 border border-surface-200 rounded-xl space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-surface-900">{med.name}</h4>
                        <p className="text-[11px] text-surface-500">{med.dosage} • {med.frequency}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-clinical-700 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200">
                        {med.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {med.instructions && (
                      <p className="text-xs text-surface-600 bg-white p-2 rounded border border-surface-200/80">
                        {med.instructions}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Pill className="w-8 h-8" />}
                title="No active medications on record"
                description="This patient has not logged any daily pharmacotherapy or adherence tracking regimens."
              />
            )}
          </div>
        )}

        {/* Tab 3: Prescriptions */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-surface-900">Doctor-Issued E-Prescriptions</h3>
                <p className="text-xs text-surface-500">Official prescriptions issued during clinical telemedicine consults</p>
              </div>
              <Link
                to={`/prescriptions?patientId=${patient.id}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Issue Prescription</span>
              </Link>
            </div>

            {patient.prescriptions && patient.prescriptions.length > 0 ? (
              <div className="space-y-4">
                {patient.prescriptions.map((rx: any) => (
                  <div key={rx.id} className="p-4 border border-surface-200 rounded-xl bg-surface-50/50 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-clinical-700 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200">
                          Prescription #{rx.id.slice(0, 8)}
                        </span>
                        <p className="text-xs text-surface-500 mt-1">
                          Prescribed by: Dr. {rx.doctor?.user?.name || 'Physician'} • Date: {new Date(rx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Link
                        to={`/prescriptions?patientId=${patient.id}`}
                        className="text-xs font-semibold text-clinical-600 hover:text-clinical-800"
                      >
                        View Full Details
                      </Link>
                    </div>

                    {rx.clinicalNotes && (
                      <p className="text-xs text-surface-600 italic bg-white p-2 rounded border border-surface-200">
                        "{rx.clinicalNotes}"
                      </p>
                    )}

                    {rx.items && rx.items.length > 0 && (
                      <div className="bg-white rounded-lg border border-surface-200 divide-y divide-surface-100 text-xs">
                        {rx.items.map((item: any) => (
                          <div key={item.id} className="p-2.5 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-surface-900">{item.medicationName}</span>
                              <span className="text-surface-500 ml-2">({item.dosage} • {item.frequency})</span>
                            </div>
                            <span className="text-surface-500">{item.durationDays} Days</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<FileText className="w-8 h-8" />}
                title="No prescriptions issued yet"
                description="You can issue an official clinical e-prescription with itemized medications for this patient."
                actionText="Issue E-Prescription"
                onAction={() => navigate(`/prescriptions?patientId=${patient.id}`)}
              />
            )}
          </div>
        )}

        {/* Tab 4: Medical Reports */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-surface-900">Diagnostic Reports & Documents</h3>
                <p className="text-xs text-surface-500">Encrypted lab test results, imaging, and hospital summaries</p>
              </div>
              <Link
                to={`/reports?patientId=${patient.id}`}
                className="text-xs font-semibold text-clinical-600 hover:text-clinical-800"
              >
                Upload / Manage Documents &rarr;
              </Link>
            </div>

            {patient.medicalReports && patient.medicalReports.length > 0 ? (
              <div className="divide-y divide-surface-100">
                {patient.medicalReports.map((rep: any) => (
                  <div key={rep.id} className="py-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-surface-900">{rep.title}</h4>
                      <p className="text-[11px] text-surface-500 mt-0.5">
                        {rep.reportType} • {rep.fileName} • {new Date(rep.reportDate || rep.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <a
                      href={`/api/reports/${rep.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-surface-700 hover:text-surface-900 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-clinical-600" />
                      <span>Download</span>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Download className="w-8 h-8" />}
                title="No medical documents uploaded"
                description="There are currently no diagnostic lab reports or clinical PDFs on file for this patient."
              />
            )}
          </div>
        )}

        {/* Tab 5: Consultations */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-sm text-surface-900">Consultation History</h3>
              <p className="text-xs text-surface-500">Scheduled, active, and past telemedicine consultations</p>
            </div>

            {patient.appointments && patient.appointments.length > 0 ? (
              <div className="divide-y divide-surface-100">
                {patient.appointments.map((appt: any) => (
                  <div key={appt.id} className="py-3.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-surface-900">
                          {appt.appointmentDate} at {appt.startTime} - {appt.endTime}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.2 rounded uppercase ${
                            appt.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : appt.status === 'CONFIRMED'
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-surface-100 text-surface-600'
                          }`}
                        >
                          {appt.status}
                        </span>
                        <span className="text-[10px] text-surface-400">({appt.type})</span>
                      </div>
                      {appt.reason && (
                        <p className="text-xs text-surface-600 mt-1 italic">"{appt.reason}"</p>
                      )}
                    </div>

                    {appt.status === 'CONFIRMED' && (
                      <Link
                        to={`/consultation/${appt.id}`}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-2xs"
                      >
                        Enter Consultation
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Calendar className="w-8 h-8" />}
                title="No appointment history"
                description="This patient has no recorded consultation sessions."
              />
            )}
          </div>
        )}

        {/* Tab 6: Voice Triage History */}
        {activeTab === 'triage' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-sm text-surface-900">Multilingual Voice Triage History</h3>
              <p className="text-xs text-surface-500">
                AI and rule-classified pre-consultation symptom assessments performed by this patient
              </p>
            </div>

            {patient.voiceTriageSessions && patient.voiceTriageSessions.length > 0 ? (
              <div className="space-y-4">
                {patient.voiceTriageSessions.map((session: any) => {
                  let symptoms: string[] = [];
                  try {
                    symptoms = typeof session.symptomsDetected === 'string'
                      ? JSON.parse(session.symptomsDetected)
                      : session.symptomsDetected || [];
                  } catch {
                    symptoms = [];
                  }

                  const isUrgent = session.urgencyLevel === 'URGENT_EVALUATION';
                  const isAttention = session.urgencyLevel === 'MEDICAL_ATTENTION';

                  return (
                    <div
                      key={session.id}
                      className={`p-4 rounded-xl border space-y-3 ${
                        isUrgent
                          ? 'bg-rose-50/60 border-rose-200'
                          : isAttention
                          ? 'bg-amber-50/60 border-amber-200'
                          : 'bg-surface-50 border-surface-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                              isUrgent
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : isAttention
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {session.urgencyLabel || session.urgencyLevel}
                          </span>
                          <span className="text-xs text-surface-500">
                            Language: <span className="font-semibold uppercase">{session.language}</span>
                          </span>
                        </div>

                        <span className="text-[11px] text-surface-400">
                          {new Date(session.createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Reported symptoms */}
                      {symptoms.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-surface-600">Symptoms Detected:</span>
                          {symptoms.map((sym: string, i: number) => (
                            <span
                              key={i}
                              className="text-[10px] font-medium bg-white px-2 py-0.5 rounded border border-surface-200 text-surface-800"
                            >
                              {sym}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Patient Transcript */}
                      {session.rawTranscript && (
                        <div className="text-xs text-surface-700 bg-white/80 p-2.5 rounded-lg border border-surface-200">
                          <span className="font-semibold text-surface-800 block text-[11px]">Patient Voice Transcript:</span>
                          <p className="italic mt-0.5">"{session.rawTranscript}"</p>
                        </div>
                      )}

                      {/* Recommended Clinical Action */}
                      {session.recommendedAction && (
                        <div className="text-xs text-surface-700 flex items-start gap-1.5">
                          <span className="font-semibold text-surface-900 shrink-0">Recommended Action:</span>
                          <span>{session.recommendedAction}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={<Mic className="w-8 h-8" />}
                title="No voice triage assessments"
                description="This patient has not conducted any voice symptom triage sessions."
              />
            )}
          </div>
        )}

        {/* Tab 7: Doctor Private Notes */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-surface-900">Doctor Private Notes (Confidential)</h3>
                <p className="text-xs text-surface-500">Internal physician clinical notes — strictly private from patient view</p>
              </div>
              <button
                onClick={() => setShowNoteModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Note</span>
              </button>
            </div>

            {patient.doctorNotes && patient.doctorNotes.length > 0 ? (
              <div className="space-y-3">
                {patient.doctorNotes.map((note: any) => (
                  <div key={note.id} className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-surface-900">{note.title}</h4>
                      <span className="text-[10px] text-surface-400">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-surface-700 leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Lock className="w-8 h-8" />}
                title="No private notes recorded"
                description="Record confidential physician observations, differential diagnoses, or follow-up plans."
                actionText="Add Private Note"
                onAction={() => setShowNoteModal(true)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
