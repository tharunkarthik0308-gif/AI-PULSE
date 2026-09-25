export interface User {
  id: string;
  email: string;
  name: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  patientProfileId?: string;
  doctorProfileId?: string;
  preferredLanguage?: string;
}

export interface PatientProfile {
  id: string;
  userId: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  emergencyContact?: string;
  preferredLanguage: string;
  bloodGroup?: string;
  allergies?: string;
  medicalConditions?: string;
  profileImage?: string;
  user?: { name: string; email: string };
  createdAt?: string;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  specialty?: string | null;
  qualification?: string | null;
  experienceYears?: number | null;
  clinicHospital?: string | null;
  languagesSpoken?: string | null;
  consultationModes: string;
  consultationFee: number;
  bio?: string;
  isVerified: boolean;
  profileImage?: string;
  user: { name: string; email: string };
  availabilities?: DoctorAvailability[];
}

export interface DoctorAvailability {
  id: string;
  doctorId: string;
  dayOfWeek?: number;
  specificDate?: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
}

export interface Appointment {
  id: string;
  patientId: string;
  patient: {
    id: string;
    user: { name: string; email: string };
  };
  doctorId: string;
  doctor: {
    id: string;
    specialty: string;
    clinicHospital?: string;
    consultationFee?: number;
    user: { name: string; email: string };
  };
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  type: 'VIDEO' | 'CHAT' | 'IN_PERSON';
  reason?: string;
  notes?: string;
  videoRoomId: string;
  createdAt: string;
}

export interface ScanReport {
  id: string;
  patientId: string;
  timestamp: string;
  estimatedHeartRate: number;
  stressLevel: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';
  riskLevel: 'NORMAL' | 'EVALUATE' | 'ATTENTION' | 'HIGH_RISK';
  faceQuality: number;
  signalQuality: number;
  confidence: number;
  scanDuration: number;
  algorithmVersion: string;
  waveformData?: string;
  aiSummary?: string;
  doctorReviewed?: boolean;
  patient?: { user: { name: string; email: string } };
}

export interface MedicalReport {
  id: string;
  patientId: string;
  uploadedById: string;
  title: string;
  reportType: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  notes?: string;
  reportDate: string;
}

export interface DoctorNote {
  id: string;
  doctorId: string;
  patientId: string;
  appointmentId?: string;
  title: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patient?: { user: { name: string; email: string } };
  doctorId: string;
  doctor?: { user: { name: string; email: string }; specialty: string; clinicHospital?: string };
  appointmentId?: string;
  clinicalNotes?: string;
  diagnosisContext?: string;
  followUpDate?: string;
  items: PrescriptionItem[];
  createdAt: string;
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions?: string;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  timesOfDay: string;
  startDate: string;
  endDate?: string;
  instructions?: string;
  isActive: boolean;
  logs?: MedicationLog[];
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'TAKEN' | 'SKIPPED' | 'MISSED';
  takenAt?: string;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderRole: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  sender?: { id: string; name: string; role: string };
}

export interface ChatRoom {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  patient: { user: { id: string; name: string; email: string } };
  doctor: { user: { id: string; name: string; email: string } };
  messages?: ChatMessage[];
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  linkUrl?: string;
  metadata?: string;
  createdAt: string;
}

export interface HealthTimelineEvent {
  id: string;
  patientId: string;
  eventType: 'FACE_SCAN' | 'APPOINTMENT' | 'VIDEO_CONSULTATION' | 'REPORT' | 'PRESCRIPTION' | 'MEDICATION_LOG' | 'DOCTOR_NOTE';
  title: string;
  summary: string;
  referenceId?: string;
  isDoctorOnly: boolean;
  eventDate: string;
  createdAt: string;
}
