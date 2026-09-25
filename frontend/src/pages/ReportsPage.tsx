import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Upload,
  Download,
  AlertCircle,
  FileCheck,
  Calendar,
  Clock,
  Plus,
  User,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/common/EmptyState';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const isDoctor = user?.role === 'DOCTOR';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const patientIdParam = searchParams.get('patientId');

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [requiresPatientSelection, setRequiresPatientSelection] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState('LAB_TEST');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetPatientId, setTargetPatientId] = useState(patientIdParam || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setPatientError(null);
      const res = await api.getMyReports(patientIdParam || undefined);
      if (res.success) {
        if (res.requiresPatientSelection) {
          setRequiresPatientSelection(true);
          setReports([]);
          setSelectedPatient(null);
        } else {
          setRequiresPatientSelection(false);
          setReports(res.reports || []);
          if (res.patient) {
            setSelectedPatient(res.patient);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      setPatientError(err.message || 'Failed to load medical reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientIdParam) {
      setTargetPatientId(patientIdParam);
    }
    fetchReports();
  }, [patientIdParam]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a valid medical document file.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', title || selectedFile.name);
    formData.append('reportType', reportType);
    if (notes) formData.append('notes', notes);
    if (isDoctor && targetPatientId) formData.append('targetPatientId', targetPatientId);

    try {
      const res = await api.uploadReport(formData);
      if (res.success) {
        setShowUploadModal(false);
        setTitle('');
        setNotes('');
        setSelectedFile(null);
        fetchReports();
      }
    } catch (err: any) {
      setError(err.message || 'Error uploading document.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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

      {/* Title */}
      <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-clinical-600 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200">
            Clinical Documentation
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 mt-1">
            Medical Reports & Diagnostic Documents
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            Encrypted diagnostic lab tests, clinical discharge summaries, and medical imaging documents.
          </p>
        </div>

        {(!isDoctor || (isDoctor && patientIdParam && !patientError)) && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-xl shadow-clinical transition-colors self-start sm:self-auto"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Medical Document</span>
          </button>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-surface-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-surface-200 shadow-elevation max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <h3 className="text-base font-bold text-surface-900">Upload Clinical Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-surface-400 p-1">
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                  Report Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Complete Blood Count (CBC) Panel"
                  className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                />
              </div>

              {isDoctor && (
                <div>
                  <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                    Target Patient ID
                  </label>
                  <input
                    type="text"
                    required
                    value={targetPatientId}
                    onChange={(e) => setTargetPatientId(e.target.value)}
                    placeholder="Enter patient profile ID"
                    className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                  Document Category
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                >
                  <option value="LAB_TEST">Laboratory Test Panel</option>
                  <option value="SCAN">Imaging & Radiology Scan</option>
                  <option value="CLINICAL_DISCHARGE">Clinical Discharge Summary</option>
                  <option value="SCREENING_SUMMARY">Screening Summary</option>
                  <option value="OTHER">Other Clinical Record</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                  Select Document File (PDF, PNG, JPEG - Max 10MB)
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-surface-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-clinical-50 file:text-clinical-700 hover:file:bg-clinical-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                  Physician / Lab Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional clinical context or remarks..."
                  className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs text-surface-600 hover:bg-surface-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-subtle disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reports Grid */}
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
          title="Select a patient to view medical reports"
          description="Medical reports and diagnostic documents are patient-specific. Please select a patient from your Command Center to view or upload their documents."
          actionText="Return to Command Center"
          onAction={() => navigate('/doctor/dashboard')}
        />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="No medical documents uploaded yet"
          description={
            isDoctor
              ? 'No medical documents on file for this patient.'
              : 'Upload laboratory tests, diagnostic scans, or medical summaries for permanent encrypted record keeping.'
          }
          actionText={!isDoctor || (isDoctor && patientIdParam) ? 'Upload Document' : undefined}
          onAction={!isDoctor || (isDoctor && patientIdParam) ? () => setShowUploadModal(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="bg-white border border-surface-200 rounded-2xl p-5 shadow-subtle flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200 shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-surface-600 bg-surface-100 px-2 py-0.5 rounded">
                    {rep.reportType}
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="font-bold text-sm text-surface-900 truncate">{rep.title}</h3>
                  <p className="text-[11px] text-surface-500 mt-0.5">
                    {rep.fileName} ({(rep.fileSize / 1024).toFixed(1)} KB)
                  </p>
                </div>

                {rep.notes && (
                  <p className="text-xs text-surface-600 bg-surface-50 p-2.5 rounded-lg border border-surface-100 mt-3 line-clamp-2">
                    {rep.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-surface-100 flex items-center justify-between text-xs text-surface-500">
                <span className="text-[11px]">
                  {new Date(rep.reportDate).toLocaleDateString()}
                </span>
                <a
                  href={`/api/reports/${rep.id}/download`}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-clinical-700 bg-clinical-50 hover:bg-clinical-100 border border-clinical-200 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
