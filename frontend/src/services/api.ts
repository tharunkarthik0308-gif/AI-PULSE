const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ''}/api`;

const getHeaders = (isFormData: boolean = false): HeadersInit => {
  const token = localStorage.getItem('medcore_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

const handleResponse = async (res: Response) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }
  return data;
};

export const api = {
  // Auth
  login: async (credentials: any) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse(res);
  },

  register: async (payload: any) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  updateProfile: async (data: any) => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Patients
  getPatientDashboard: async () => {
    const res = await fetch(`${API_BASE}/patients/dashboard`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getPatientById: async (patientId: string) => {
    const res = await fetch(`${API_BASE}/patients/${patientId}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Doctors
  getDoctorDashboard: async () => {
    const res = await fetch(`${API_BASE}/doctors/dashboard`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getDoctorPatients: async (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE}/doctors/patients${query}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  removePatientFromActiveCare: async (patientId: string) => {
    const res = await fetch(
      `${API_BASE}/doctors/patients/${patientId}/active-care`,
      {
        method: 'DELETE',
        headers: getHeaders(),
      }
    );
    return handleResponse(res);
  },

  listDoctors: async (params?: { specialty?: string; language?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/doctors${query ? `?${query}` : ''}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getDoctorById: async (id: string) => {
    const res = await fetch(`${API_BASE}/doctors/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  setDoctorAvailability: async (availabilities: any[]) => {
    const res = await fetch(`${API_BASE}/doctors/availability`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ availabilities }),
    });
    return handleResponse(res);
  },

  // Appointments
  createAppointment: async (payload: any) => {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  getMyAppointments: async (params?: { status?: string; date?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/appointments${query ? `?${query}` : ''}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  updateAppointmentStatus: async (id: string, status: string, notes?: string) => {
    const res = await fetch(`${API_BASE}/appointments/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, notes }),
    });
    return handleResponse(res);
  },

  getAppointmentRoom: async (id: string) => {
    const res = await fetch(`${API_BASE}/appointments/${id}/room`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  startConsultation: async (id: string) => {
    const res = await fetch(`${API_BASE}/appointments/${id}/consultation/start`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  endConsultation: async (id: string, payload?: { durationSeconds?: number; doctorNotesSummary?: string }) => {
    const res = await fetch(`${API_BASE}/appointments/${id}/consultation/end`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload || {}),
    });
    return handleResponse(res);
  },

  getConsultationSession: async (id: string) => {
    const res = await fetch(`${API_BASE}/appointments/${id}/consultation`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Scans
  saveScan: async (payload: any) => {
    const res = await fetch(`${API_BASE}/scans`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  getMyScans: async (limit?: number) => {
    const res = await fetch(`${API_BASE}/scans${limit ? `?limit=${limit}` : ''}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getScanById: async (id: string) => {
    const res = await fetch(`${API_BASE}/scans/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Reports
  uploadReport: async (formData: FormData) => {
    const res = await fetch(`${API_BASE}/reports/upload`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData,
    });
    return handleResponse(res);
  },

  getMyReports: async (patientId?: string) => {
    const query = patientId ? `?patientId=${patientId}` : '';
    const res = await fetch(`${API_BASE}/reports${query}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Doctor Notes
  createDoctorNote: async (payload: any) => {
    const res = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  getDoctorNotes: async (patientId: string) => {
    const res = await fetch(`${API_BASE}/notes/patient/${patientId}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Prescriptions
  createPrescription: async (payload: any) => {
    const res = await fetch(`${API_BASE}/prescriptions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  getPrescriptions: async (patientId?: string) => {
    const query = patientId ? `?patientId=${patientId}` : '';
    const res = await fetch(`${API_BASE}/prescriptions${query}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getPrescriptionById: async (id: string) => {
    const res = await fetch(`${API_BASE}/prescriptions/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Medications & Adherence
  getMedications: async (patientId?: string) => {
    const query = patientId ? `?patientId=${patientId}` : '';
    const res = await fetch(`${API_BASE}/medications${query}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  createMedication: async (payload: any) => {
    const res = await fetch(`${API_BASE}/medications`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  logDose: async (payload: any) => {
    const res = await fetch(`${API_BASE}/medications/log`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Timeline
  getTimeline: async (patientId?: string) => {
    const query = patientId ? `?patientId=${patientId}` : '';
    const res = await fetch(`${API_BASE}/timeline${query}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Triage
  evaluateTriage: async (transcript: string, language?: string) => {
    const res = await fetch(`${API_BASE}/triage/evaluate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ transcript, language }),
    });
    return handleResponse(res);
  },

  // AI Analysis
  getHealthAnalysis: async (timeRange: string = '30', patientId?: string) => {
    let url = `${API_BASE}/ai/analysis?timeRange=${timeRange}`;
    if (patientId) url += `&patientId=${patientId}`;
    const res = await fetch(url, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Notifications
  getNotifications: async () => {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  markNotificationRead: async (id: string) => {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Chat
  getChatRooms: async () => {
    const res = await fetch(`${API_BASE}/chat/rooms`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getRoomMessages: async (roomId: string) => {
    const res = await fetch(`${API_BASE}/chat/rooms/${roomId}/messages`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
};
