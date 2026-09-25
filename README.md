# MEDCORE
### AI-Powered Contactless Health Monitoring & Connected Telemedicine Platform

> **IMPORTANT MEDICAL SAFETY NOTICE:**
> MedCore contactless screening is an AI-assisted investigational tool designed for general wellness and preliminary screening. It does not provide medical diagnoses or replace consultation with a qualified medical professional.

---

## 1. System Overview

**MedCore** is a modern, real-time clinical telehealth and contactless hemodynamic screening platform. It bridges camera-based photoplethysmography (rPPG) with connected telemedicine consultations, e-prescriptions, real-time chat, medication schedule adherence, and multilingual voice triage (English, Tamil, Hindi).

### Key Features
1. **Contactless Webcam-Based Health Screening**: Real camera frame sampling, MediaPipe FaceMesh forehead ROI tracking, green-channel differential signal extraction (2G-R-B), detrending, smoothing, physiological peak detection, estimated heart rate (BPM), and HRV RMSSD stress classification.
2. **AI Clinical Decision Support**: Aggregates real stored screening trends with Google Gemini / deterministic rule-based clinical analysis (observations, wellness recommendations, and strictly no invented symptoms or disease diagnoses).
3. **Multilingual Voice Triage**: Web Speech API speech recognition in English (`en-US`), Tamil (`ta-IN`), and Hindi (`hi-IN`) with rule-based symptom extraction and clinical urgency triage (*Routine*, *Medical Attention*, *Urgent Professional Evaluation*).
4. **Telemedicine Consultations**: Private video consultation rooms powered by Jitsi Meet External API with unique room IDs per appointment.
5. **Real-Time Encrypted Chat**: Patient-doctor direct messaging via Socket.io with persistent message history and read receipts.
6. **E-Prescriptions (Rx)**: Structured digital prescriptions with medications, dosage, instructions, follow-up dates, and printable clinical views.
7. **Medication Schedule & Adherence**: Mathematically calculated adherence percentage computed strictly from actual patient dose logs.
8. **Doctor Private Notes**: Physician clinical notes strictly restricted from patient access.
9. **Unified Health Timeline**: Chronological patient journey aggregating scans, consultations, reports, prescriptions, and dose logs.
10. **Smart Screening Alerts**: Automated notifications and doctor escalation when an elevated or tachycardic pattern is recorded.

---

## 2. Architecture & Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React 18, Vite, TypeScript | Fast bundling, strict typing, responsive performance |
| **Styling** | Tailwind CSS v3 | Clinical design system tokens (Teal `#0f766e`, Slate `#0f172a`, graphite text) |
| **Data Viz** | Recharts & HTML5 Canvas | Responsive trend charting and 30fps real-time arterial pulse waveform rendering |
| **Icons** | Lucide React | High-legibility clinical iconography |
| **Backend** | Node.js, Express, TypeScript | Modular REST API with centralized error handling |
| **Real-Time** | Socket.io | Bidirectional WebSocket communication for notifications, chat, and signaling |
| **Database** | SQLite via Prisma ORM | Zero-dependency local setup, full ACID compliance, relational foreign keys, swappable to PostgreSQL via 1 line in `schema.prisma` |
| **Computer Vision** | MediaPipe FaceMesh & WebRTC | Forehead landmark tracking, ROI distance/motion checks, and rPPG color extraction |
| **Telemedicine** | Jitsi Meet External API | Encrypted peer video rooms with isolated IDs |
| **AI Decision Support** | Google GenAI SDK (Gemini 2.5) | Clinical decision-support summaries grounded exclusively on real structured metrics |

---

## 3. Database Choice & Rationale

**Chosen Database:** **SQLite via Prisma ORM (with 1-click switch to PostgreSQL for production)**

### Why this architecture?
1. **Zero External Dependencies for Local Development**: Runs immediately without requiring external database server installations, docker daemons, or cloud credentials.
2. **Production Portability**: Prisma ORM abstracts the storage layer. To deploy to PostgreSQL (e.g., Supabase, Render, Railway, Neon, AWS RDS), modify `provider = "postgresql"` in `prisma/schema.prisma` and supply `DATABASE_URL`.
3. **Data Integrity & Relational Safety**: Medical records, appointments, and prescriptions require ACID guarantees, foreign keys, cascade deletes, and relational integrity.
4. **Data Access Layer**: Controllers query data strictly through Prisma, ensuring the frontend never depends on database internals.

---

## 4. Default Clinical Demo Credentials

Use these verified accounts to explore the platform:

| Role | Email | Password | Details |
|---|---|---|---|
| **Doctor (Cardiology)** | `doctor@medcore.com` | `Doctor123!` | Dr. Sarah Jenkins, MD - 12 Yrs Exp |
| **Doctor (Internal Med)** | `doctor.rajesh@medcore.com` | `Doctor123!` | Dr. Rajesh Sharma, MD - 9 Yrs Exp (EN, HI, TA) |
| **Patient** | `patient@medcore.com` | `Patient123!` | Alex Mercer - 34 Yrs, Blood O+ |

---

## 5. Getting Started

### Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v9+

### Backend Setup
```bash
cd backend
npm install
npx prisma db push
npm run seed
npm run dev
```
Backend runs securely at `http://localhost:5005`.

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173` (proxied to port 5005).

---

## 6. Running End-to-End Automated Verification Tests

To verify that all 27 clinical workflows, authentication layers, screening classifications, and appointments pass:
```bash
cd backend
node test-e2e.js
```
Expected output:
```
====================================================
TEST SUMMARY: 27 / 27 TESTS PASSED (100%)
====================================================
ALL CLINICAL E2E WORKFLOW TESTS PASSED PERFECTLY!
```

---

## 7. Medical Safety & Disclaimer Notice

MedCore implements strict clinical guardrails:
- The system never diagnoses heart disease, diabetes, hypertension, respiratory disease, or mental health disorders.
- Vitals are categorized as **"Estimated Heart Rate"**, **"Screening Pattern"**, **"Signal Quality"**, and **"Professional Review Recommended"**.
- Prominent banners remind users that webcam rPPG is an investigational decision-support tool.
