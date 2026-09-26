import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  HeartPulse,
  Calendar,
  ArrowRight,
  AlertCircle,
  MoreVertical,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/common/EmptyState';
import { MedicalDisclaimer } from '../components/common/MedicalDisclaimer';

export const PatientDirectoryPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [removingPatient, setRemovingPatient] = useState<any | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchPatients = async (search?: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDoctorPatients(search);
      if (res.success) {
        setPatients(res.patients || []);
      }
    } catch (err: any) {
      console.error('Error fetching doctor patient directory:', err);
      setError(err.message || 'Error retrieving patient directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const calculateAge = (dobString?: string): string => {
    if (!dobString) return 'Age not recorded';
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return dobString;
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return `${age} yrs (${dobString})`;
  };

  const handleConfirmRemove = async () => {
    if (!removingPatient) return;
    try {
      setIsRemoving(true);
      await api.removePatientFromActiveCare(removingPatient.id);
      setRemovingPatient(null);
      fetchPatients(searchQuery);
    } catch (err: any) {
      console.error('Error removing patient from active care:', err);
      setError(err.message || 'Failed to remove patient from active care.');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-clinical-600 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200">
              Clinical Roster
            </span>
            <span className="text-xs text-surface-500">• Verified Cohort Only</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 mt-1">
            Patient Directory
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            Patients who have scheduled or completed clinical consultations under your direct care.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient name..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-surface-50 border border-surface-200 rounded-xl text-surface-900 placeholder-surface-400 focus:bg-white focus:border-clinical-500 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-400 hover:text-surface-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <MedicalDisclaimer />

      {/* Directory Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 bg-surface-100 rounded-2xl border border-surface-200" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
          <h3 className="text-sm font-bold text-surface-900">Failed to load directory</h3>
          <p className="text-xs text-surface-600 max-w-sm mx-auto">{error}</p>
          <button
            onClick={() => fetchPatients(searchQuery)}
            className="px-4 py-2 text-xs font-semibold text-white bg-clinical-600 rounded-xl hover:bg-clinical-700"
          >
            Retry
          </button>
        </div>
      ) : patients.length === 0 ? (
        searchQuery ? (
          <EmptyState
            icon={<Search className="w-8 h-8" />}
            title="No matching patients found"
            description={`No patients in your cohort match the search term "${searchQuery}".`}
            actionText="Clear Search"
            onAction={() => setSearchQuery('')}
          />
        ) : (
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="No patients under your care yet"
            description="Patients who schedule or complete consultations with you will automatically populate this clinical roster."
            actionText="Return to Command Center"
            onAction={() => navigate('/doctor/dashboard')}
          />
        )
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
              {patients.length} Patient{patients.length === 1 ? '' : 's'} Under Care
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((pat) => {
              const latestScan = pat.latestScan;
              const lastAppt = pat.lastAppointment;

              return (
                <div
                  key={pat.id}
                  className="bg-white border border-surface-200 rounded-2xl p-5 shadow-subtle hover:border-surface-300 transition-all flex flex-col justify-between space-y-4"
                >
                  {/* Top info */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-clinical-50 border border-clinical-200 text-clinical-700 font-bold text-sm flex items-center justify-center shrink-0">
                          {pat.name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-surface-900 leading-tight">
                            {pat.name}
                          </h3>
                          <p className="text-[11px] text-surface-500 mt-0.5">
                            {calculateAge(pat.dateOfBirth)} • {pat.gender || 'Not specified'}
                          </p>
                        </div>
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenu(activeMenu === pat.id ? null : pat.id)
                          }
                          className="p-2 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
                          aria-label={`More actions for ${pat.name}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenu === pat.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute right-0 top-10 z-20 w-48 bg-white border border-surface-200 rounded-xl shadow-lg p-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenu(null);
                                  setRemovingPatient(pat);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                Remove from Active Care
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status grid */}
                    <div className="mt-3 pt-3 border-t border-surface-100 grid grid-cols-2 gap-2 text-[11px]">
                      {/* Latest screening */}
                      <div className="bg-surface-50 p-2 rounded-lg border border-surface-100">
                        <span className="text-surface-400 block text-[10px] uppercase font-semibold">
                          Latest Screening
                        </span>
                        {latestScan ? (
                          <div className="mt-1">
                            <div className="flex items-center gap-1 font-bold text-surface-900">
                              <HeartPulse className="w-3.5 h-3.5 text-clinical-600 shrink-0" />
                              <span>{latestScan.estimatedHeartRate} BPM</span>
                            </div>
                            <span
                              className={`inline-block mt-0.5 text-[9px] font-semibold px-1 py-0.2 rounded uppercase ${latestScan.riskLevel === 'NORMAL'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                                }`}
                            >
                              {latestScan.riskLevel}
                            </span>
                          </div>
                        ) : (
                          <span className="text-surface-400 italic text-[10px] mt-1 block">
                            No screenings
                          </span>
                        )}
                      </div>

                      {/* Last Appointment */}
                      <div className="bg-surface-50 p-2 rounded-lg border border-surface-100">
                        <span className="text-surface-400 block text-[10px] uppercase font-semibold">
                          Consultation
                        </span>
                        {lastAppt ? (
                          <div className="mt-1">
                            <div className="flex items-center gap-1 font-semibold text-surface-800">
                              <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span className="truncate">{lastAppt.appointmentDate}</span>
                            </div>
                            <span className="text-[9px] text-surface-500 block truncate">
                              {lastAppt.startTime} ({lastAppt.status})
                            </span>
                          </div>
                        ) : (
                          <span className="text-surface-400 italic text-[10px] mt-1 block">
                            No appointments
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-surface-100 flex items-center justify-between gap-2">
                    <Link
                      to={`/analysis?patientId=${pat.id}`}
                      className="px-3 py-1.5 text-xs font-semibold text-surface-700 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg transition-colors"
                      title="AI Health Analysis"
                    >
                      AI Analysis
                    </Link>
                    <Link
                      to={`/doctor/patients/${pat.id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-subtle transition-colors"
                    >
                      <span>Dossier</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Remove from Active Care Confirmation Modal */}
      {removingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-surface-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <h3 className="text-base font-bold text-surface-900">Remove from Active Care</h3>
              <button
                type="button"
                onClick={() => setRemovingPatient(null)}
                className="text-surface-400 hover:text-surface-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-surface-600">
              Are you sure you want to remove <span className="font-bold text-surface-900">{removingPatient.name}</span> from your active care cohort?
            </p>

            <div className="bg-surface-50 border border-surface-200 rounded-xl p-3 text-xs text-surface-500">
              This action only removes the patient from your active roster. Their clinical history, past consultations, vitals, and records will remain safely intact in the database.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRemovingPatient(null)}
                disabled={isRemoving}
                className="px-4 py-2 text-xs font-semibold text-surface-700 bg-surface-100 hover:bg-surface-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={isRemoving}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isRemoving ? 'Removing...' : 'Remove Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
