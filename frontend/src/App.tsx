import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';

// Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PatientDashboard } from './pages/PatientDashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { FaceScanPage } from './pages/FaceScanPage';
import { HealthAnalysisPage } from './pages/HealthAnalysisPage';
import { VoiceTriagePage } from './pages/VoiceTriagePage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { VideoConsultationPage } from './pages/VideoConsultationPage';
import { ChatPage } from './pages/ChatPage';
import { PrescriptionsPage } from './pages/PrescriptionsPage';
import { MedicationsPage } from './pages/MedicationsPage';
import { ReportsPage } from './pages/ReportsPage';
import { HealthTimelinePage } from './pages/HealthTimelinePage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { PatientDirectoryPage } from './pages/PatientDirectoryPage';

// Protected Route wrapper with role check
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: Array<'PATIENT' | 'DOCTOR' | 'ADMIN'>;
}> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="w-10 h-10 border-4 border-clinical-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'DOCTOR' ? '/doctor/dashboard' : '/dashboard'} replace />;
  }

  return <>{children}</>;
};

// Root index redirect based on role
const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'DOCTOR') return <Navigate to="/doctor/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <SocketProvider>
            <div className="min-h-screen flex flex-col bg-surface-50 text-surface-900 font-sans">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />

                  {/* Patient Routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['PATIENT']}>
                        <PatientDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Doctor Routes */}
                  <Route
                    path="/doctor/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                        <DoctorDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor/patients"
                    element={
                      <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                        <PatientDirectoryPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor/patients/:patientId"
                    element={
                      <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                        <PatientDetailPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Shared / Clinical Feature Routes */}
                  <Route
                    path="/scan"
                    element={
                      <ProtectedRoute allowedRoles={['PATIENT']}>
                        <FaceScanPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/analysis"
                    element={
                      <ProtectedRoute>
                        <HealthAnalysisPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/triage"
                    element={
                      <ProtectedRoute>
                        <VoiceTriagePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/appointments"
                    element={
                      <ProtectedRoute>
                        <AppointmentsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/consultation/:appointmentId"
                    element={
                      <ProtectedRoute>
                        <VideoConsultationPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/chat"
                    element={
                      <ProtectedRoute>
                        <ChatPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/prescriptions"
                    element={
                      <ProtectedRoute>
                        <PrescriptionsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/medications"
                    element={
                      <ProtectedRoute>
                        <MedicationsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute>
                        <ReportsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/timeline"
                    element={
                      <ProtectedRoute>
                        <HealthTimelinePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* 404 Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </SocketProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
