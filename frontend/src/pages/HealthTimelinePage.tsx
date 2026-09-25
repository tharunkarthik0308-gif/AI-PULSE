import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  Camera,
  Calendar,
  Video,
  FileText,
  Pill,
  Clock,
  ShieldCheck,
  CheckCircle,
  User,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { EmptyState } from '../components/common/EmptyState';

export const HealthTimelinePage: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isDoctor = user?.role === 'DOCTOR';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const patientIdParam = searchParams.get('patientId');

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [requiresPatientSelection, setRequiresPatientSelection] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      setPatientError(null);
      const res = await api.getTimeline(patientIdParam || undefined);
      if (res.success) {
        if (res.requiresPatientSelection) {
          setRequiresPatientSelection(true);
          setEvents([]);
          setSelectedPatient(null);
        } else {
          setRequiresPatientSelection(false);
          setEvents(res.events || []);
          if (res.patient) {
            setSelectedPatient(res.patient);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching timeline:', err);
      if (err.message?.includes('Access denied') || err.message?.includes('clinical relationship') || err.message?.includes('403')) {
        setPatientError(err.message || 'Access denied. You do not have an active clinical relationship with this patient.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [patientIdParam]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'FACE_SCAN':
        return <Camera className="w-4 h-4 text-teal-600" />;
      case 'APPOINTMENT':
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'VIDEO_CONSULTATION':
        return <Video className="w-4 h-4 text-emerald-600" />;
      case 'REPORT':
        return <FileText className="w-4 h-4 text-purple-600" />;
      case 'PRESCRIPTION':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'MEDICATION_LOG':
        return <Pill className="w-4 h-4 text-rose-600" />;
      default:
        return <HeartPulse className="w-4 h-4 text-surface-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
          icon={<HeartPulse className="w-10 h-10 text-clinical-500" />}
          title="Select Patient to View Health Timeline"
          description="Select a patient from your appointment schedule or patient dossier to view their clinical timeline."
          actionText="Return to Command Center"
          onAction={() => navigate('/doctor/dashboard')}
        />
      ) : !patientError && (
        <>
          {/* Title */}
          <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle">
            <span className="text-xs font-semibold uppercase tracking-wider text-clinical-600 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200">
              {isDoctor ? 'Patient Longitudinal Timeline' : 'Chronological Records'}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-surface-900 mt-1">
              {t('nav_timeline')}
            </h1>
            <p className="text-xs text-surface-500 mt-0.5">
              {isDoctor
                ? 'Chronological clinical audit log showing face screenings, consultations, prescriptions, and adherence events.'
                : 'Unified patient journey tracking screenings, consultations, prescription issuances, and adherence logs.'}
            </p>
          </div>

      {loading ? (
        <div className="h-64 bg-surface-100 rounded-2xl animate-pulse" />
      ) : events.length === 0 ? (
        <EmptyState
          icon={<HeartPulse className="w-8 h-8" />}
          title="No health timeline events recorded yet"
          description="Screenings, booked appointments, and medication intake will populate your chronological timeline automatically."
        />
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-200">
          {events.map((ev) => (
            <div key={ev.id} className="relative group">
              {/* Dot Icon */}
              <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-white border-2 border-surface-300 group-hover:border-clinical-500 flex items-center justify-center transition-colors shadow-2xs">
                {getEventIcon(ev.eventType)}
              </div>

              {/* Event Card */}
              <div className="bg-white border border-surface-200 rounded-2xl p-4 shadow-subtle hover:border-surface-300 transition-colors ml-2 space-y-1">
                <div className="flex items-start justify-between">
                  <h3 className="text-xs font-bold text-surface-900">{ev.title}</h3>
                  <span className="text-[10px] text-surface-400">
                    {new Date(ev.eventDate).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    •{' '}
                    {new Date(ev.eventDate).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-surface-600 leading-relaxed">{ev.summary}</p>
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
};
