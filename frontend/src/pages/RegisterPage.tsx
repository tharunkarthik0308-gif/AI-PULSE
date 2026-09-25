import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HeartPulse, Lock, Mail, AlertCircle, ArrowRight, Stethoscope, User, Phone, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { MedicalDisclaimer } from '../components/common/MedicalDisclaimer';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [role, setRole] = useState<'PATIENT' | 'DOCTOR'>('PATIENT');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');

  // Patient specifics - start empty without demo values
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');

  // Doctor specifics - start empty without demo values
  const [specialty, setSpecialty] = useState('');
  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [clinicHospital, setClinicHospital] = useState('');
  const [consultationFee, setConsultationFee] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validations
    if (!name.trim()) {
      setError('Please enter your full legal name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);

    const payload: any = {
      role,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone.trim() || undefined,
      preferredLanguage,
    };

    if (role === 'PATIENT') {
      if (dateOfBirth) payload.dateOfBirth = dateOfBirth;
      if (gender) payload.gender = gender;
      if (bloodGroup) payload.bloodGroup = bloodGroup;
      if (allergies.trim()) payload.allergies = allergies.trim();
    } else {
      if (specialty.trim()) payload.specialty = specialty.trim();
      if (qualification.trim()) payload.qualification = qualification.trim();
      if (experienceYears.trim()) payload.experienceYears = Number(experienceYears);
      if (clinicHospital.trim()) payload.clinicHospital = clinicHospital.trim();
      if (consultationFee.trim()) payload.consultationFee = Number(consultationFee);
      payload.languagesSpoken = preferredLanguage === 'ta' ? 'Tamil, English' : preferredLanguage === 'hi' ? 'Hindi, English' : 'English';
    }

    try {
      await register(payload);
      navigate(role === 'DOCTOR' ? '/doctor/dashboard' : '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-clinical-600 flex items-center justify-center text-white shadow-clinical">
            <HeartPulse className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-surface-900">
          Create Your AI-Pulse Account
        </h2>
        <p className="mt-1 text-xs text-surface-500">
          Select your registration role to configure clinical access controls
        </p>

        {/* Role Toggle Selector */}
        <div className="mt-6 inline-flex p-1 bg-surface-100 rounded-xl border border-surface-200">
          <button
            type="button"
            onClick={() => setRole('PATIENT')}
            className={`flex items-center gap-1.5 px-6 py-2 text-xs font-semibold rounded-lg transition-all ${
              role === 'PATIENT'
                ? 'bg-white text-clinical-700 shadow-subtle border border-surface-200'
                : 'text-surface-600 hover:text-surface-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Patient Onboarding</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('DOCTOR')}
            className={`flex items-center gap-1.5 px-6 py-2 text-xs font-semibold rounded-lg transition-all ${
              role === 'DOCTOR'
                ? 'bg-white text-clinical-700 shadow-subtle border border-surface-200'
                : 'text-surface-600 hover:text-surface-900'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Doctor / Clinician</span>
          </button>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 border border-surface-200 shadow-elevation rounded-2xl">
          {error && (
            <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === 'DOCTOR' ? 'Dr. Firstname Lastname, MD' : 'Enter your full name'}
                  className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500 focus:ring-1 focus:ring-clinical-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500 focus:ring-1 focus:ring-clinical-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                  Secure Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500 focus:ring-1 focus:ring-clinical-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500 focus:ring-1 focus:ring-clinical-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                  Preferred Language
                </label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                >
                  <option value="en">English (English)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="hi">हिंदी (Hindi)</option>
                </select>
              </div>

              {role === 'PATIENT' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                    >
                      <option value="">Select Gender (Optional)</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                      Clinical Specialty
                    </label>
                    <input
                      type="text"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="e.g. Cardiology, Internal Medicine"
                      className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                      Qualification
                    </label>
                    <input
                      type="text"
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                      placeholder="e.g. MD, MBBS, DO"
                      className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {role === 'PATIENT' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                    Blood Group
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                  >
                    <option value="">Select Blood Group (Optional)</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                    Known Allergies
                  </label>
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g. Penicillin, Sulfa, None"
                    className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                    Experience (Yrs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                    Clinic / Hospital Affiliation
                  </label>
                  <input
                    type="text"
                    value={clinicHospital}
                    onChange={(e) => setClinicHospital(e.target.value)}
                    placeholder="e.g. City General Hospital"
                    className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
                    Fee ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:bg-white focus:border-clinical-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 py-2.5 px-4 bg-clinical-600 hover:bg-clinical-700 text-white text-xs font-semibold rounded-lg shadow-subtle flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Registering...' : 'Complete Registration'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-surface-500">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-clinical-600 hover:text-clinical-700">
              Sign in to your account
            </Link>
          </div>
        </div>

        <div className="mt-6">
          <MedicalDisclaimer compact />
        </div>
      </div>
    </div>
  );
};
