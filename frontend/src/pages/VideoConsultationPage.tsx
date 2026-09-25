import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Video,
  PhoneOff,
  User,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileText,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MedicalDisclaimer } from '../components/common/MedicalDisclaimer';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export const VideoConsultationPage: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<any>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [callActive, setCallActive] = useState<boolean>(false);

  const jitsiContainerRef = useRef<HTMLDivElement | null>(null);
  const jitsiApiRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Fetch consultation room data
  useEffect(() => {
    const fetchRoom = async () => {
      if (!appointmentId) return;
      try {
        setLoading(true);
        const res = await api.getAppointmentRoom(appointmentId);
        if (res.success) {
          setRoomData(res.room);
        }
      } catch (err: any) {
        setError(err.message || 'Access denied to this consultation room.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [appointmentId]);

  // Initialize Jitsi Meet when roomData is ready
  useEffect(() => {
    if (!roomData || !jitsiContainerRef.current) return;

    if (window.JitsiMeetExternalAPI) {
      const domain = 'meet.jit.si';
      const options = {
        roomName: `AIPulse-${roomData.videoRoomId}`,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: `${user?.role === 'DOCTOR' ? 'Dr. ' : ''}${user?.name}`,
          email: user?.email,
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
          enableWelcomePage: false,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'closedcaptions',
            'desktop',
            'fullscreen',
            'hangup',
            'chat',
            'settings',
            'videoquality',
          ],
        },
      };

      const jitsi = new window.JitsiMeetExternalAPI(domain, options);

      jitsi.addEventListeners({
        videoConferenceJoined: async () => {
          setCallActive(true);
          timerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
          if (appointmentId) {
            try {
              await api.startConsultation(appointmentId);
            } catch (err) {
              console.warn('Could not record consultation start:', err);
            }
          }
        },
        videoConferenceLeft: () => {
          handleEndCall();
        },
      });

      jitsiApiRef.current = jitsi;
    }

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [roomData, appointmentId]);

  const handleEndCall = async () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setCallActive(false);
    if (appointmentId) {
      try {
        await api.endConsultation(appointmentId, { durationSeconds: callDuration });
      } catch (err) {
        console.warn('Could not record consultation end:', err);
      }
    }
    navigate(user?.role === 'DOCTOR' ? '/doctor/dashboard' : '/dashboard');
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 border-4 border-clinical-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-surface-700">
          Establishing encrypted consultation channel...
        </p>
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-surface-900">Consultation Room Error</h2>
        <p className="text-xs text-surface-500">{error || 'Room not accessible'}</p>
        <button
          onClick={() => navigate('/appointments')}
          className="px-4 py-2 bg-clinical-600 text-white text-xs font-semibold rounded-lg"
        >
          Return to Appointments
        </button>
      </div>
    );
  }

  const partnerLabel =
    user?.role === 'DOCTOR' ? `Patient: ${roomData.patient.name}` : `Dr. ${roomData.doctor.name}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Consultation Session Header Bar */}
      <div className="bg-white border border-surface-200 rounded-2xl p-4 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-clinical-600 text-white flex items-center justify-center shadow-clinical">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-surface-900">{partnerLabel}</h2>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Encrypted Peer Session
              </span>
            </div>
            <p className="text-xs text-surface-500">
              Appointment: {roomData.appointmentDate} • Reason: {roomData.reason || 'Clinical Consultation'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {callActive && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-50 border border-surface-200 rounded-lg text-xs font-mono text-surface-700">
              <Clock className="w-3.5 h-3.5 text-clinical-600" />
              <span>{formatTimer(callDuration)}</span>
            </div>
          )}

          <button
            onClick={handleEndCall}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-clinical transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
            <span>End Call</span>
          </button>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="bg-surface-950 rounded-2xl overflow-hidden aspect-video border border-surface-800 shadow-elevation">
        <div ref={jitsiContainerRef} className="w-full h-full min-h-[480px]" />
      </div>

      <MedicalDisclaimer compact />
    </div>
  );
};
