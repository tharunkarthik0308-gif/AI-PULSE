import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Printer,
  Calendar,
  User,
  AlertCircle,
  Pill,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/common/EmptyState';

export const PrescriptionsPage: React.FC = () => {
  const { user } = useAuth();
  const isDoctor = user?.role === 'DOCTOR';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const patientIdParam = searchParams.get('patientId');

  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [requiresPatientSelection, setRequiresPatientSelection] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);

  // Doctor modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [patientIdInput, setPatientIdInput] = useState(patientIdParam || '');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [items, setItems] = useState<any[]>([
    { medicationName: '', dosage: '', frequency: 'Once daily', durationDays: 7, instructions: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      setPatientError(null);
      const res = await api.getPrescriptions(patientIdParam || undefined);
      if (res.success) {
        if (res.requiresPatientSelection) {
          setRequiresPatientSelection(true);
          setPrescriptions([]);
          setSelectedPatient(null);
        } else {
          setRequiresPatientSelection(false);
          setPrescriptions(res.prescriptions || []);
          if (res.patient) {
            setSelectedPatient(res.patient);
            setPatientIdInput(res.patient.id);
          }
          if (res.prescriptions && res.prescriptions.length > 0 && !selectedPrescription) {
            setSelectedPrescription(res.prescriptions[0]);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching prescriptions:', err);
      setPatientError(err.message || 'Failed to load prescriptions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientIdParam) {
      setPatientIdInput(patientIdParam);
    }
    fetchPrescriptions();
  }, [patientIdParam]);

  const handleAddItem = () => {
    setItems([
      ...items,
      { medicationName: '', dosage: '', frequency: 'Once daily', durationDays: 7, instructions: '' },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...items];
    updated[index][field] = val;
    setItems(updated);
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientIdInput.trim()) {
      setFormError('Patient ID is required.');
      return;
    }
    const invalidItem = items.some((it) => !it.medicationName || !it.dosage);
    if (invalidItem) {
      setFormError('Please fill out medication name and dosage for all items.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await api.createPrescription({
        patientId: patientIdInput.trim(),
        clinicalNotes,
        followUpDate: followUpDate || null,
        items,
      });

      if (res.success) {
        setShowCreateModal(false);
        fetchPrescriptions();
      }
    } catch (err: any) {
      setFormError(err.message || 'Error issuing prescription.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-clinical-600 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200">
            {isDoctor && selectedPatient ? `Patient: ${selectedPatient.user?.name}` : 'E-Prescription Records'}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 mt-1">
            Electronic Prescriptions (Rx)
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            {isDoctor && selectedPatient
              ? `Prescriptions on file for ${selectedPatient.user?.name} (Blood Group: ${selectedPatient.bloodGroup || 'Not specified'}).`
              : 'Prescriptions issued by your treating clinician are securely stored here.'}
          </p>
        </div>

        {isDoctor && patientIdParam && !patientError && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-xl shadow-clinical transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Issue E-Prescription</span>
          </button>
        )}
      </div>

      {/* Doctor Create Prescription Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-surface-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-surface-200 shadow-elevation max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <h3 className="text-base font-bold text-surface-900">
                Issue Electronic Prescription
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-surface-400 p-1">
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePrescription} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                    Patient
                  </label>
                  {selectedPatient ? (
                    <div className="p-2.5 bg-clinical-50 border border-clinical-200 rounded-lg">
                      <p className="text-xs font-bold text-surface-900 truncate">
                        {selectedPatient.user?.name}
                      </p>
                      <p className="text-[10px] text-surface-500 truncate">
                        {selectedPatient.bloodGroup ? `Blood: ${selectedPatient.bloodGroup} • ` : ''}ID: {patientIdParam}
                      </p>
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      value={patientIdInput}
                      onChange={(e) => setPatientIdInput(e.target.value)}
                      placeholder="Enter Patient ID (UUID)"
                      className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-lg"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                    Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                  Clinical Notes / Diagnosis Context
                </label>
                <textarea
                  rows={2}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Clinical assessment, dietary recommendations, and precautions..."
                  className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-lg"
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-surface-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-surface-900 uppercase">
                    Medication Items ({items.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold text-clinical-600 hover:text-clinical-800"
                  >
                    + Add Medication
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-surface-50 border border-surface-200 rounded-xl space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Medication name"
                        value={item.medicationName}
                        onChange={(e) => handleItemChange(idx, 'medicationName', e.target.value)}
                        className="p-2 text-xs bg-white border border-surface-200 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Dosage (e.g. 500mg)"
                        value={item.dosage}
                        onChange={(e) => handleItemChange(idx, 'dosage', e.target.value)}
                        className="p-2 text-xs bg-white border border-surface-200 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Frequency (e.g. Twice daily)"
                        value={item.frequency}
                        onChange={(e) => handleItemChange(idx, 'frequency', e.target.value)}
                        className="p-2 text-xs bg-white border border-surface-200 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="number"
                        placeholder="Days (e.g. 7)"
                        value={item.durationDays}
                        onChange={(e) => handleItemChange(idx, 'durationDays', e.target.value)}
                        className="p-2 text-xs bg-white border border-surface-200 rounded-lg sm:col-span-1"
                      />
                      <input
                        type="text"
                        placeholder="Instructions (e.g. after food)"
                        value={item.instructions}
                        onChange={(e) => handleItemChange(idx, 'instructions', e.target.value)}
                        className="p-2 text-xs bg-white border border-surface-200 rounded-lg sm:col-span-2"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-xs text-rose-600 hover:text-rose-800 p-1"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs text-surface-600 hover:bg-surface-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-subtle disabled:opacity-50"
                >
                  {submitting ? 'Issuing...' : 'Issue Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-64 bg-surface-100 rounded-2xl animate-pulse" />
      ) : patientError ? (
        <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center space-y-3 shadow-subtle max-w-lg mx-auto">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-surface-900">Patient Access Restricted</h3>
          <p className="text-xs text-surface-500">{patientError}</p>
          <button
            onClick={() => navigate('/doctor/dashboard')}
            className="px-4 py-2 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-subtle transition-colors"
          >
            Return to Command Center
          </button>
        </div>
      ) : requiresPatientSelection || (isDoctor && !patientIdParam) ? (
        <EmptyState
          icon={<FileText className="w-8 h-8 text-clinical-600" />}
          title="Select a patient to view or issue prescriptions"
          description="Electronic prescriptions are patient-specific. Please open a patient's dossier from your Command Center to view their prescription history or issue new medications."
          actionText="Return to Command Center"
          onAction={() => navigate('/doctor/dashboard')}
        />
      ) : prescriptions.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="No electronic prescriptions on file"
          description={
            isDoctor
              ? `No prescriptions have been issued for ${selectedPatient?.user?.name || 'this patient'} yet.`
              : 'E-prescriptions issued during your clinical teleconsultations will be securely stored here.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Prescriptions List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-surface-700 block mb-2">
              Prescription History ({prescriptions.length})
            </span>

            {prescriptions.map((rx) => {
              const isSelected = selectedPrescription?.id === rx.id;
              return (
                <div
                  key={rx.id}
                  onClick={() => setSelectedPrescription(rx)}
                  className={`p-4 bg-white border rounded-2xl shadow-subtle cursor-pointer transition-all ${
                    isSelected ? 'border-clinical-500 ring-2 ring-clinical-500/20' : 'border-surface-200 hover:border-surface-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-surface-900">
                        Dr. {rx.doctor?.user?.name}
                      </h4>
                      <p className="text-[11px] text-surface-500">{rx.doctor?.specialty}</p>
                    </div>
                    <span className="text-[10px] text-surface-400">
                      {new Date(rx.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-surface-600 mt-2 line-clamp-1">
                    {rx.items?.map((it: any) => it.medicationName).join(', ')}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Detailed Printable Clinical View (8 cols) */}
          <div className="lg:col-span-8">
            {selectedPrescription ? (
              <div
                id="printable-rx"
                className="bg-white border border-surface-200 rounded-2xl p-8 shadow-elevation space-y-6"
              >
                {/* Print Header Action */}
                <div className="flex items-center justify-between border-b border-surface-200 pb-4 print:hidden">
                  <span className="text-xs font-semibold uppercase tracking-wider text-clinical-600">
                    Official Telemedicine Prescription
                  </span>
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-surface-700 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-clinical-600" />
                    <span>Print / Save PDF</span>
                  </button>
                </div>

                {/* Formal Clinic Header */}
                <div className="flex items-start justify-between border-b border-surface-200 pb-6">
                  <div>
                    <h2 className="text-lg font-bold text-surface-900">
                      Dr. {selectedPrescription.doctor?.user?.name}
                    </h2>
                    <p className="text-xs text-clinical-700 font-medium">
                      {selectedPrescription.doctor?.specialty}
                    </p>
                    <p className="text-[11px] text-surface-500">
                      {selectedPrescription.doctor?.clinicHospital || 'AI-Pulse Telehealth Clinic'}
                    </p>
                  </div>
                  <div className="text-right text-xs text-surface-500 space-y-0.5">
                    <p className="font-semibold text-surface-900">Rx ID: {selectedPrescription.id.slice(0, 8)}</p>
                    <p>Date: {new Date(selectedPrescription.createdAt).toLocaleDateString()}</p>
                    {selectedPrescription.followUpDate && (
                      <p className="text-clinical-700 font-medium">
                        Follow-Up: {selectedPrescription.followUpDate}
                      </p>
                    )}
                  </div>
                </div>

                {/* Patient Information Box */}
                <div className="p-3 bg-surface-50 rounded-xl border border-surface-200 text-xs text-surface-700 flex items-center justify-between">
                  <span>
                    <strong className="text-surface-900">Patient: </strong>
                    {selectedPrescription.patient?.user?.name || user?.name}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-700">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Digitally Authenticated</span>
                  </span>
                </div>

                {/* Rx Items Table */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-serif font-bold text-clinical-700">℞</span>
                    <span className="text-xs font-bold text-surface-700 uppercase tracking-wider">
                      Prescribed Medications
                    </span>
                  </div>

                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-surface-200 text-surface-500 uppercase tracking-wider text-[10px]">
                        <th className="py-2">Medication</th>
                        <th className="py-2">Dosage</th>
                        <th className="py-2">Frequency</th>
                        <th className="py-2">Duration</th>
                        <th className="py-2">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {selectedPrescription.items?.map((item: any) => (
                        <tr key={item.id} className="text-surface-800">
                          <td className="py-2.5 font-semibold text-surface-900">
                            {item.medicationName}
                          </td>
                          <td className="py-2.5">{item.dosage}</td>
                          <td className="py-2.5">{item.frequency}</td>
                          <td className="py-2.5">{item.durationDays} Days</td>
                          <td className="py-2.5 text-surface-500">{item.instructions || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Clinical Notes */}
                {selectedPrescription.clinicalNotes && (
                  <div className="pt-4 border-t border-surface-200">
                    <span className="text-xs font-bold text-surface-700 uppercase tracking-wider block mb-1">
                      Doctor Clinical Notes & Advice
                    </span>
                    <p className="text-xs text-surface-600 bg-surface-50 p-3 rounded-xl border border-surface-200 leading-relaxed">
                      {selectedPrescription.clinicalNotes}
                    </p>
                  </div>
                )}

                {/* Digital Stamp & Signature */}
                <div className="pt-6 border-t border-surface-200 flex items-center justify-between text-xs text-surface-400">
                  <p className="italic">
                    AI-Pulse Verified Telehealth E-Prescription System
                  </p>
                  <div className="text-right">
                    <p className="font-script text-base text-surface-800 italic">
                      Dr. {selectedPrescription.doctor?.user?.name}
                    </p>
                    <p className="text-[10px]">Digital Signature Record</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
