import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Pill,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  TrendingUp,
  User,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { MetricCard } from '../components/common/MetricCard';
import { EmptyState } from '../components/common/EmptyState';

export const MedicationsPage: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isDoctor = user?.role === 'DOCTOR';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const patientIdParam = searchParams.get('patientId');

  const [medications, setMedications] = useState<any[]>([]);
  const [adherence, setAdherence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [requiresPatientSelection, setRequiresPatientSelection] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);

  // Add medication modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [timesOfDay, setTimesOfDay] = useState('08:00');
  const [instructions, setInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMedications = async () => {
    try {
      setLoading(true);
      setPatientError(null);
      const res = await api.getMedications(patientIdParam || undefined);
      if (res.success) {
        if (res.requiresPatientSelection) {
          setRequiresPatientSelection(true);
          setMedications([]);
          setAdherence(null);
          setSelectedPatient(null);
        } else {
          setRequiresPatientSelection(false);
          setMedications(res.medications || []);
          setAdherence(res.adherence || null);
          if (res.patient) {
            setSelectedPatient(res.patient);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching medications:', err);
      if (err.message?.includes('Access denied') || err.message?.includes('clinical relationship') || err.message?.includes('403')) {
        setPatientError(err.message || 'Access denied. You do not have an active clinical relationship with this patient.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, [patientIdParam]);

  const handleLogDose = async (medicationId: string, scheduledTime: string, status: 'TAKEN' | 'SKIPPED') => {
    try {
      await api.logDose({
        medicationId,
        scheduledTime,
        status,
      });
      fetchMedications();
    } catch (err) {
      console.error('Error logging dose:', err);
    }
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dosage) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.createMedication({
        name,
        dosage,
        frequency,
        timesOfDay: [timesOfDay],
        instructions,
      });

      if (res.success) {
        setShowAddModal(false);
        setName('');
        setDosage('');
        setInstructions('');
        fetchMedications();
      }
    } catch (err: any) {
      setError(err.message || 'Error adding medication.');
    } finally {
      setSubmitting(false);
    }
  };

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

      {/* Doctor Empty State when no patient selected */}
      {isDoctor && (!patientIdParam || requiresPatientSelection) && !patientError ? (
        <EmptyState
          icon={<Pill className="w-10 h-10 text-clinical-500" />}
          title="Select Patient to View Medications"
          description="Select a patient from your appointment schedule or patient dossier to view their medications and adherence logs."
          actionText="Return to Command Center"
          onAction={() => navigate('/doctor/dashboard')}
        />
      ) : !patientError && (
        <>
          {/* Title */}
          <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-clinical-600 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200">
                {isDoctor ? 'Clinical Pharmacotherapy Review' : 'Pharmacotherapy & Adherence'}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-surface-900 mt-1">
                {t('nav_medications')} & Adherence Tracker
              </h1>
              <p className="text-xs text-surface-500 mt-0.5">
                {isDoctor
                  ? 'Inspect patient treatment adherence, daily dose compliance, and active self-managed drug regimens.'
                  : 'Log scheduled doses to maintain accurate treatment adherence metrics for your care team.'}
              </p>
              {!isDoctor && (
                <p className="text-[11px] text-surface-400 mt-1">
                  Looking for official doctor-issued prescriptions?{' '}
                  <a href="/prescriptions" className="text-clinical-600 underline font-medium hover:text-clinical-700">
                    View your E-Prescriptions &rarr;
                  </a>
                </p>
              )}
            </div>

            {!isDoctor && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-xl shadow-clinical transition-colors self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medication</span>
              </button>
            )}
          </div>

          {/* Adherence Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              title="Schedule Adherence Rate"
              value={adherence?.rate !== null && adherence?.rate !== undefined ? `${adherence.rate}%` : '—'}
              sublabel="Calculated mathematically from 30-day dose logs"
              statusBadge={
                adherence?.rate !== null && adherence?.rate !== undefined
                  ? {
                      text: adherence.rate >= 80 ? 'Compliant' : 'Sub-Optimal',
                      variant: adherence.rate >= 80 ? 'success' : 'warning',
                    }
                  : undefined
              }
              icon={<TrendingUp className="w-5 h-5 text-clinical-600" />}
            />

            <MetricCard
              title="Doses Confirmed Taken"
              value={adherence?.takenCount || 0}
              unit="Doses"
              sublabel="Logged as taken on schedule"
              statusBadge={{ text: 'Recorded', variant: 'info' }}
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            />

            <MetricCard
              title="Doses Skipped"
              value={adherence?.skippedCount || 0}
              unit="Doses"
              sublabel="Explicitly marked as skipped"
              statusBadge={{
                text: adherence?.skippedCount > 0 ? (isDoctor ? 'Needs Review' : 'Review With Doctor') : 'Zero Missed',
                variant: adherence?.skippedCount > 0 ? 'warning' : 'neutral',
              }}
              icon={<XCircle className="w-5 h-5 text-amber-600" />}
            />
          </div>

          {/* Add Medication Modal */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 bg-surface-950/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-surface-200 shadow-elevation max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-surface-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-surface-900">Add New Medication</h3>
                    <p className="text-[11px] text-surface-500">Personal schedule for tracking adherence</p>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="text-surface-400 p-1">
                    ✕
                  </button>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 text-xs">
                  <span className="font-semibold block mb-0.5">Personal Medication Entry</span>
                  This logs a medication in your personal schedule for adherence tracking. Official clinical prescriptions must be issued by a physician during consultation.
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleAddMedication} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                      Medication Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Metformin, Lisinopril, Omega-3"
                      className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                        Dosage
                      </label>
                      <input
                        type="text"
                        required
                        value={dosage}
                        onChange={(e) => setDosage(e.target.value)}
                        placeholder="e.g. 500mg, 1 tablet"
                        className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                        Daily Schedule Time
                      </label>
                      <input
                        type="time"
                        required
                        value={timesOfDay}
                        onChange={(e) => setTimesOfDay(e.target.value)}
                        className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                      Frequency
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                    >
                      <option value="Once daily">Once daily</option>
                      <option value="Twice daily">Twice daily</option>
                      <option value="Thrice daily">Thrice daily</option>
                      <option value="As needed">As needed (PRN)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                      Instructions
                    </label>
                    <input
                      type="text"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="e.g. Take with food in the morning"
                      className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-xs text-surface-600 hover:bg-surface-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-subtle disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : 'Save Medication'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Medications List */}
          {loading ? (
            <div className="h-64 bg-surface-100 rounded-2xl animate-pulse" />
          ) : medications.length === 0 ? (
            <EmptyState
              icon={<Pill className="w-8 h-8" />}
              title="No active medications logged"
              description={
                isDoctor
                  ? 'This patient has no recorded medications or daily adherence logs in the system.'
                  : 'Record your prescribed regimen to start monitoring treatment adherence.'
              }
              actionText={isDoctor ? undefined : 'Add Medication'}
              onAction={isDoctor ? undefined : () => setShowAddModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {medications.map((med) => {
                const todayLog = med.logs && med.logs[0];
                const isTaken = todayLog?.status === 'TAKEN';
                const isSkipped = todayLog?.status === 'SKIPPED';

                return (
                  <div
                    key={med.id}
                    className="bg-white border border-surface-200 rounded-2xl p-5 shadow-subtle flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-sm text-surface-900">{med.name}</h3>
                          <p className="text-xs text-surface-500">
                            {med.dosage} • {med.frequency}
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold text-clinical-700 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200">
                          Active
                        </span>
                      </div>

                      {med.instructions && (
                        <p className="text-xs text-surface-600 bg-surface-50 p-2.5 rounded-lg border border-surface-100 mt-3">
                          <span className="font-medium text-surface-700">Instructions: </span>
                          {med.instructions}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-surface-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-surface-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Today's Status:</span>
                      </div>

                      <div>
                        {isTaken ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Taken Today</span>
                          </span>
                        ) : isSkipped ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Skipped</span>
                          </span>
                        ) : isDoctor ? (
                          <span className="text-xs text-surface-400 italic">Pending patient check-in</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleLogDose(med.id, '08:00', 'SKIPPED')}
                              className="px-2.5 py-1 text-xs text-surface-600 hover:bg-surface-100 rounded border border-surface-200"
                            >
                              Skip
                            </button>
                            <button
                              onClick={() => handleLogDose(med.id, '08:00', 'TAKEN')}
                              className="px-3 py-1 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-subtle"
                            >
                              Mark Taken
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
