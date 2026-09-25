import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Calendar,
  Camera,
  FileText,
  HeartPulse,
  LogOut,
  Bell,
  MessageSquare,
  Mic,
  Pill,
  TrendingUp,
  Globe,
  User as UserIcon,
  Users,
  ShieldCheck,
  CheckCircle,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSocket } from '../../context/SocketContext';
import { Language } from '../../i18n/translations';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { notifications, unreadCount, markAsRead } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const isDoctor = user?.role === 'DOCTOR';

  // Primary top-level desktop items
  const primaryPatientLinks = [
    { to: '/dashboard', label: t('nav_dashboard'), icon: <Activity className="w-4 h-4" /> },
    { to: '/scan', label: t('nav_scan'), icon: <Camera className="w-4 h-4" /> },
    { to: '/analysis', label: t('nav_analysis'), icon: <TrendingUp className="w-4 h-4" /> },
    { to: '/triage', label: t('nav_triage'), icon: <Mic className="w-4 h-4" /> },
    { to: '/appointments', label: t('nav_appointments'), icon: <Calendar className="w-4 h-4" /> },
  ];

  // Secondary items housed in the "More ▾" dropdown on desktop to prevent overflow
  const morePatientLinks = [
    { to: '/medications', label: t('nav_medications'), icon: <Pill className="w-4 h-4" /> },
    { to: '/prescriptions', label: t('nav_prescriptions'), icon: <FileText className="w-4 h-4" /> },
    { to: '/reports', label: t('nav_reports'), icon: <FileText className="w-4 h-4" /> },
    { to: '/timeline', label: t('nav_timeline'), icon: <HeartPulse className="w-4 h-4" /> },
    { to: '/chat', label: t('nav_chat'), icon: <MessageSquare className="w-4 h-4" /> },
  ];

  const primaryDoctorLinks = [
    { to: '/doctor/dashboard', label: t('nav_doctor_command'), icon: <Activity className="w-4 h-4" /> },
    { to: '/doctor/patients', label: 'Patients', icon: <Users className="w-4 h-4" /> },
    { to: '/appointments', label: t('nav_appointments'), icon: <Calendar className="w-4 h-4" /> },
    { to: '/chat', label: t('nav_chat'), icon: <MessageSquare className="w-4 h-4" /> },
  ];

  const moreDoctorLinks = [
    { to: '/prescriptions', label: t('nav_prescriptions'), icon: <FileText className="w-4 h-4" /> },
    { to: '/reports', label: t('nav_reports'), icon: <FileText className="w-4 h-4" /> },
    { to: '/medications', label: t('nav_medications'), icon: <Pill className="w-4 h-4" /> },
    { to: '/timeline', label: t('nav_timeline'), icon: <HeartPulse className="w-4 h-4" /> },
    { to: '/analysis', label: t('nav_analysis'), icon: <TrendingUp className="w-4 h-4" /> },
  ];

  const navLinks = isDoctor
    ? [...primaryDoctorLinks, ...moreDoctorLinks]
    : [...primaryPatientLinks, ...morePatientLinks];

  const isMoreActive = (isDoctor ? moreDoctorLinks : morePatientLinks).some((l) => isActive(l.to));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    setShowLangMenu(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-surface-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link
              to={isAuthenticated ? (isDoctor ? '/doctor/dashboard' : '/dashboard') : '/'}
              className="flex items-center gap-2 group"
            >
              <div className="w-9 h-9 rounded-lg bg-clinical-600 flex items-center justify-center text-white shadow-sm group-hover:bg-clinical-700 transition-colors">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-surface-900 group-hover:text-clinical-700 transition-colors">
                  AI-PULSE
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider text-clinical-600 bg-clinical-50 px-1.5 py-0.5 rounded border border-clinical-200">
                  Clinical Telehealth
                </span>
              </div>
            </Link>
          </div>

          {/* Center Navigation Links (when authenticated) */}
          {isAuthenticated && (
            <nav className="hidden lg:flex items-center gap-1">
              {(isDoctor ? primaryDoctorLinks : primaryPatientLinks).map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive(link.to)
                      ? 'bg-clinical-50 text-clinical-700 border border-clinical-200 shadow-xs'
                      : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              ))}

              {/* Secondary items housed in dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isMoreActive
                      ? 'bg-clinical-50 text-clinical-700 border border-clinical-200 shadow-xs'
                      : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'
                  }`}
                >
                  <span>{isDoctor ? 'Clinical Records' : 'More'}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      showMoreMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showMoreMenu && (
                  <div
                    className="absolute left-0 mt-2 w-52 bg-white border border-surface-200 rounded-xl shadow-elevation py-1 z-50 animate-in fade-in"
                    onMouseLeave={() => setShowMoreMenu(false)}
                  >
                    {(isDoctor ? moreDoctorLinks : morePatientLinks).map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setShowMoreMenu(false)}
                        className={`flex items-center gap-2 px-3.5 py-2 text-xs transition-colors ${
                          isActive(link.to)
                            ? 'bg-clinical-50 text-clinical-700 font-semibold'
                            : 'text-surface-700 hover:bg-surface-50 hover:text-surface-900'
                        }`}
                      >
                        <span className={isActive(link.to) ? 'text-clinical-600' : 'text-surface-400'}>
                          {link.icon}
                        </span>
                        <span>{link.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          )}

          {/* Right Actions: Language Switcher, Notifications, User Menu */}
          <div className="flex items-center gap-2">
            {/* Multilingual Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-lg border border-surface-200"
                title="Select Language"
              >
                <Globe className="w-3.5 h-3.5 text-clinical-600" />
                <span className="uppercase">{language}</span>
              </button>

              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-36 bg-white border border-surface-200 rounded-lg shadow-elevation py-1 z-50 animate-in fade-in">
                  <button
                    onClick={() => handleLanguageSelect('en')}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-surface-50 ${
                      language === 'en' ? 'text-clinical-700 font-semibold' : 'text-surface-700'
                    }`}
                  >
                    <span>English</span>
                    {language === 'en' && <CheckCircle className="w-3.5 h-3.5 text-clinical-600" />}
                  </button>
                  <button
                    onClick={() => handleLanguageSelect('ta')}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-surface-50 ${
                      language === 'ta' ? 'text-clinical-700 font-semibold' : 'text-surface-700'
                    }`}
                  >
                    <span>தமிழ் (Tamil)</span>
                    {language === 'ta' && <CheckCircle className="w-3.5 h-3.5 text-clinical-600" />}
                  </button>
                  <button
                    onClick={() => handleLanguageSelect('hi')}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-surface-50 ${
                      language === 'hi' ? 'text-clinical-700 font-semibold' : 'text-surface-700'
                    }`}
                  >
                    <span>हिंदी (Hindi)</span>
                    {language === 'hi' && <CheckCircle className="w-3.5 h-3.5 text-clinical-600" />}
                  </button>
                </div>
              )}
            </div>

            {isAuthenticated ? (
              <>
                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors"
                    title={t('dash_notifications')}
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-surface-200 rounded-xl shadow-elevation py-2 z-50">
                      <div className="px-4 py-2 border-b border-surface-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-surface-900">
                          {t('dash_notifications')} ({unreadCount})
                        </span>
                        {unreadCount > 0 && (
                          <button
                            onClick={() => markAsRead('all')}
                            className="text-[11px] text-clinical-600 hover:text-clinical-800 font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-surface-100">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-xs text-surface-400">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              onClick={() => {
                                markAsRead(notif.id);
                                if (notif.linkUrl) navigate(notif.linkUrl);
                                setShowNotifications(false);
                              }}
                              className={`p-3 text-left cursor-pointer hover:bg-surface-50 transition-colors ${
                                !notif.isRead ? 'bg-clinical-50/40' : ''
                              }`}
                            >
                              <p className="text-xs font-semibold text-surface-900">
                                {notif.title}
                              </p>
                              <p className="text-xs text-surface-600 mt-0.5 line-clamp-2">
                                {notif.message}
                              </p>
                              <span className="text-[10px] text-surface-400 mt-1 block">
                                {new Date(notif.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Info & Role Badge */}
                <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-surface-200">
                  <div className="w-8 h-8 rounded-full bg-surface-100 border border-surface-200 flex items-center justify-center text-surface-600 font-medium text-xs">
                    {user?.name.charAt(0)}
                  </div>
                  <div className="text-left text-xs">
                    <p className="font-semibold text-surface-900 leading-tight truncate max-w-[120px]">
                      {user?.name}
                    </p>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                        user?.role === 'DOCTOR'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-teal-50 text-teal-700'
                      }`}
                    >
                      {user?.role}
                    </span>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 text-surface-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title={t('nav_sign_out')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-semibold text-surface-700 hover:text-surface-900 transition-colors"
                >
                  {t('nav_sign_in')}
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-clinical-600 hover:bg-clinical-700 rounded-lg shadow-subtle transition-colors"
                >
                  {t('nav_sign_up')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile navigation row (when authenticated) */}
      {isAuthenticated && (
        <div className="lg:hidden border-t border-surface-100 bg-surface-50/70 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                isActive(link.to)
                  ? 'bg-clinical-600 text-white'
                  : 'text-surface-600 bg-white border border-surface-200'
              }`}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      )}
    </header>
  );
};
