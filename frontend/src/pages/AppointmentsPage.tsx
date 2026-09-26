import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Video,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  MessageSquare,
  DollarSign,
  Briefcase,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { EmptyState } from '../components/common/EmptyState';

export const AppointmentsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isDoctor = user?.role === 'DOCTOR';

  const initialTab = searchParams.get('tab') === 'book' || searchParams.get('tab') === 'find'
    ? 'book_doctor'
    : 'my_appointments';

  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my_appointments' | 'book_doctor'>(initialTab);

  // Appointment removal states
  const [removingAppointment, setRemovingAppointment] = useState<any | null>(null);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync tab with URL search parameter if changed externally
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'book' || tabParam === 'find') {
      setActiveTab('book_doctor');
    }
  }, [searchParams]);

  // Booking modal state
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [bookingDate, setBookingDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [bookingTime, setBookingTime] = useState<string>('10:00');
  const [bookingReason, setBookingReason] = useState<string>('');
  const [bookingType, setBookingType] = useState<string>('VIDEO');
  const [bookingSubmitting, setBookingSubmitting] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await api.getMyAppointments();
      if (res.success) {
        setAppointments(res.appointments || []);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      setDoctorsLoading(true);
      setDoctorsError(null);
      const res = await api.listDoctors();
      if (res.success) {
        setDoctors(res.doctors || []);
      }
    } catch (err: any) {
      console.error('Error fetching doctor directory:', err);
      setDoctorsError(err.message || 'Unable to load doctors right now. Please try again.');
    } finally {
      setDoctorsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    if (!isDoctor) {
      fetchDoctors();
    }
  }, [isDoctor]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.updateAppointmentStatus(id, status);
      fetchAppointments();
    } catch (err) {
      console.error('Error updating appointment:', err);
    }
  };

  const handleConfirmRemove = async () => {
    if (!removingAppointment) return;
    try {
      setIsRemoving(true);
      const res = await api.removeAppointmentRecord(removingAppointment.id);
      if (res.success) {
        setRemovingAppointment(null);
        setSuccessMessage('Appointment record removed from doctor appointment history successfully.');
        setTimeout(() => setSuccessMessage(null), 4000);
        fetchAppointments();
      }
    } catch (err: any) {
      console.error('Error removing appointment record:', err);
      alert(err.message || 'Failed to remove appointment record.');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    setBookingSubmitting(true);
    setBookingError(null);

    // Compute end time (+30 mins)
    const [h, m] = bookingTime.split(':').map(Number);
    const endMinutes = m + 30;
    const endH = endMinutes >= 60 ? h + 1 : h;
    const endM = endMinutes >= 60 ? endMinutes - 60 : endMinutes;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    try {
      const res = await api.createAppointment({
        doctorId: selectedDoctor.id,
        appointmentDate: bookingDate,
        startTime: bookingTime,
        endTime,
        type: bookingType,
        reason: bookingReason,
      });

      if (res.success) {
        setSelectedDoctor(null);
        setBookingReason('');
        setActiveTab('my_appointments');
        fetchAppointments();
      }
    } catch (err: any) {
      setBookingError(err.message || 'Error booking appointment slot.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-clinical-600 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200">
            Telemedicine Scheduling
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 mt-1">
            {t('nav_appointments')}
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            Encrypted private consultations, doctor availability slots, and calendar management.
          </p>
        </div>

        {!isDoctor && (
          <div className="inline-flex p-1 bg-surface-100 rounded-xl border border-surface-200">
            <button
              onClick={() => setActiveTab('my_appointments')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'my_appointments'
                  ? 'bg-white text-clinical-700 shadow-subtle border border-surface-200'
                  : 'text-surface-600'
              }`}
            >
              My Appointments
            </button>
            <button
              onClick={() => setActiveTab('book_doctor')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'book_doctor'
                  ? 'bg-white text-clinical-700 shadow-subtle border border-surface-200'
                  : 'text-surface-600'
              }`}
            >
              Find & Book Doctor
            </button>
          </div>
        )}
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium shadow-subtle animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 p-0.5 rounded text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Booking Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 bg-surface-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-surface-200 shadow-elevation max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-surface-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-surface-900">
                  Book Telemedicine Consultation
                </h3>
                <p className="text-xs text-surface-500">
                  With {selectedDoctor.user?.name} ({selectedDoctor.specialty})
                </p>
              </div>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="text-surface-400 hover:text-surface-700 p-1"
              >
                ✕
              </button>
            </div>

            {bookingError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmBooking} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1 uppercase tracking-wider">
                    Appointment Date
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1 uppercase tracking-wider">
                    Start Time
                  </label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                  >
                    {[
                      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
                    ].map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1 uppercase tracking-wider">
                  Consultation Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingType('VIDEO')}
                    className={`py-2 text-xs font-medium rounded-lg border flex items-center justify-center gap-1.5 ${
                      bookingType === 'VIDEO'
                        ? 'border-clinical-500 bg-clinical-50 text-clinical-700'
                        : 'border-surface-200 bg-surface-50 text-surface-600'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Video Consultation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingType('CHAT')}
                    className={`py-2 text-xs font-medium rounded-lg border flex items-center justify-center gap-1.5 ${
                      bookingType === 'CHAT'
                        ? 'border-clinical-500 bg-clinical-50 text-clinical-700'
                        : 'border-surface-200 bg-surface-50 text-surface-600'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Real-Time Chat</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1 uppercase tracking-wider">
                  Reason for Visit / Symptoms
                </label>
                <textarea
                  rows={3}
                  required
                  value={bookingReason}
                  onChange={(e) => setBookingReason(e.target.value)}
                  placeholder="Describe your health question, symptoms, or screening review request..."
                  className="w-full p-2.5 text-xs bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setSelectedDoctor(null)}
                  className="px-4 py-2 text-xs font-medium text-surface-700 hover:bg-surface-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-subtle transition-colors disabled:opacity-50"
                >
                  {bookingSubmitting ? 'Reserving...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 1: My Appointments List */}
      {activeTab === 'my_appointments' ? (
        <div className="space-y-4">
          {loading ? (
            <div className="h-48 bg-surface-100 rounded-2xl animate-pulse" />
          ) : appointments.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-8 h-8" />}
              title="No appointments scheduled"
              description={
                isDoctor
                  ? 'Your appointment calendar has no patient bookings yet.'
                  : 'You have no scheduled doctor visits. Find a certified doctor to book your first consultation.'
              }
              actionText={!isDoctor ? 'Find Doctor' : undefined}
              onAction={!isDoctor ? () => setActiveTab('book_doctor') : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointments.map((appt) => {
                const partnerName = isDoctor
                  ? appt.patient?.user?.name
                  : appt.doctor?.user?.name;
                const partnerSub = isDoctor
                  ? `Patient ID: ${appt.patientId.slice(0, 8)}`
                  : appt.doctor?.specialty;

                return (
                  <div
                    key={appt.id}
                    className="bg-white border border-surface-200 rounded-2xl p-5 shadow-subtle flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-sm text-surface-900">{partnerName}</h3>
                          <p className="text-xs text-surface-500">{partnerSub}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                              appt.status === 'CONFIRMED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : appt.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : appt.status === 'COMPLETED'
                                ? 'bg-teal-50 text-teal-700 border-teal-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {appt.status}
                          </span>

                          {isDoctor && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveMenuId(activeMenuId === appt.id ? null : appt.id)}
                                className="p-1 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
                                aria-label="Appointment options"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeMenuId === appt.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setActiveMenuId(null)}
                                  />
                                  <div className="absolute right-0 top-8 z-20 w-40 bg-white border border-surface-200 rounded-xl shadow-lg p-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setRemovingAppointment(appt);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Remove Record</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-surface-600 mt-3 pt-3 border-t border-surface-100">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-surface-400" />
                          <span>{appt.appointmentDate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-surface-400" />
                          <span>
                            {appt.startTime} - {appt.endTime}
                          </span>
                        </div>
                        <span className="uppercase text-[10px] font-bold text-clinical-700 bg-clinical-50 px-1.5 py-0.5 rounded">
                          {appt.type}
                        </span>
                      </div>

                      {appt.reason && (
                        <p className="text-xs text-surface-600 bg-surface-50 p-2.5 rounded-lg border border-surface-200 mt-3">
                          <span className="font-semibold text-surface-700">Reason: </span>
                          {appt.reason}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-surface-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {['CONFIRMED', 'IN_PROGRESS'].includes(appt.status) && (
                          <Link
                            to={`/consultation/${appt.id}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-subtle transition-colors"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Join Video Call</span>
                          </Link>
                        )}
                        <Link
                          to="/chat"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-700 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Chat</span>
                        </Link>
                      </div>

                      {/* Doctor Action Buttons */}
                      {isDoctor && appt.status === 'PENDING' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateStatus(appt.id, 'REJECTED')}
                            className="px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-50 rounded"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(appt.id, 'CONFIRMED')}
                            className="px-3 py-1 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg"
                          >
                            Accept
                          </button>
                        </div>
                      )}

                      {/* Patient Cancel Option */}
                      {!isDoctor && appt.status === 'PENDING' && (
                        <button
                          onClick={() => handleUpdateStatus(appt.id, 'CANCELLED')}
                          className="text-xs text-rose-600 hover:text-rose-800"
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Doctor Directory for Patients */
        <div className="space-y-4">
          {doctorsLoading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 p-3.5 bg-clinical-50/70 border border-clinical-200 text-clinical-800 rounded-xl text-xs font-medium">
                <div className="w-4 h-4 border-2 border-clinical-600 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Finding available doctors across the AI-Pulse clinical network...</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-64 bg-surface-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            </div>
          ) : doctorsError ? (
            <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center space-y-3 shadow-subtle">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-surface-900">Unable to Load Doctor Directory</h3>
              <p className="text-xs text-surface-500 max-w-sm mx-auto">{doctorsError}</p>
              <button
                onClick={fetchDoctors}
                className="px-4 py-2 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-subtle transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : doctors.length === 0 ? (
            <div className="bg-white border border-surface-200 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-subtle">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-clinical-50 border border-clinical-200 flex items-center justify-center text-clinical-600 shadow-clinical">
                <User className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold text-surface-900">No doctors available yet</h3>
                <p className="text-xs text-surface-500 leading-relaxed">
                  There are currently no clinicians available for booking in the system. Registered healthcare providers will appear here once their clinical practice profiles and weekly schedules are published.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => navigate('/scan')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-xl shadow-clinical transition-colors"
                >
                  <span>Start Face Screening</span>
                </button>
                <button
                  onClick={() => navigate('/triage')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-surface-700 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-xl transition-colors"
                >
                  <span>Voice Triage</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle flex flex-col justify-between space-y-4 hover:border-clinical-400 transition-colors"
                >
                  <div>
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-full bg-clinical-50 border border-clinical-200 text-clinical-700 font-bold text-sm flex items-center justify-center shrink-0">
                        {doc.user?.name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-surface-900">{doc.user?.name}</h3>
                        <p className="text-xs text-clinical-700 font-medium">{doc.specialty}</p>
                        <p className="text-[11px] text-surface-400 mt-0.5">{doc.clinicHospital}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-surface-100 space-y-1.5 text-xs text-surface-600">
                      <p>
                        <span className="font-medium text-surface-700">Qualification: </span>
                        {doc.qualification}
                      </p>
                      <p>
                        <span className="font-medium text-surface-700">Experience: </span>
                        {doc.experienceYears} Years
                      </p>
                      <p>
                        <span className="font-medium text-surface-700">Languages: </span>
                        {doc.languagesSpoken}
                      </p>
                      <p>
                        <span className="font-medium text-surface-700">Consultation Fee: </span>
                        ${doc.consultationFee}
                      </p>
                    </div>

                    {doc.bio && (
                      <p className="text-xs text-surface-500 mt-3 bg-surface-50 p-2.5 rounded-lg border border-surface-100 line-clamp-3">
                        {doc.bio}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-surface-100">
                    <button
                      onClick={() => setSelectedDoctor(doc)}
                      className="w-full py-2 px-4 bg-clinical-600 hover:bg-clinical-700 text-white text-xs font-semibold rounded-xl shadow-subtle flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Select & Book Slot</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Remove Appointment Record Confirmation Modal */}
      {removingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-surface-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <h3 className="text-base font-bold text-surface-900">Remove Appointment Record?</h3>
              <button
                type="button"
                onClick={() => setRemovingAppointment(null)}
                disabled={isRemoving}
                className="text-surface-400 hover:text-surface-600 p-1 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-surface-600 leading-relaxed">
              This will remove this appointment from the doctor's appointment history. This action should only affect the appointment record itself and must not delete the patient account or unrelated clinical records.
            </p>

            <div className="bg-surface-50 border border-surface-200 rounded-xl p-3 text-xs space-y-1.5 text-surface-700">
              <div className="flex justify-between">
                <span className="text-surface-500">Patient:</span>
                <span className="font-semibold text-surface-900">
                  {removingAppointment.patient?.user?.name || 'Patient'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Date & Time:</span>
                <span className="font-semibold text-surface-900">
                  {removingAppointment.appointmentDate} • {removingAppointment.startTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Type & Status:</span>
                <span className="flex items-center gap-1.5">
                  <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-200 text-surface-800">
                    {removingAppointment.type}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-200 text-surface-800">
                    {removingAppointment.status}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRemovingAppointment(null)}
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
                {isRemoving ? 'Removing...' : 'Remove Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
