// E2E Verification Test Script for MedCore Platform

const API = 'http://localhost:5005/api';

async function runTests() {
  console.log('====================================================');
  console.log('MEDCORE CLINICAL PLATFORM — COMPREHENSIVE E2E VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  // 1. Health check
  const healthRes = await fetch(`${API}/health`).then((r) => r.json());
  assert(healthRes.status === 'online', '1. System Health Check API online');
  assert(healthRes.disclaimer.includes('screening'), '2. Medical Safety Disclaimer present in API response');

  // 2. Doctor Login
  const docLogin = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'doctor@medcore.com', password: 'Doctor123!' }),
  }).then((r) => r.json());
  assert(docLogin.success === true && !!docLogin.token, '3. Doctor Login and JWT issuance');
  assert(docLogin.user.role === 'DOCTOR', '4. Doctor role verification');
  const docToken = docLogin.token;
  const docProfileId = docLogin.user.doctorProfileId;

  // 3. Patient Login
  const patLogin = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'patient@medcore.com', password: 'Patient123!' }),
  }).then((r) => r.json());
  assert(patLogin.success === true && !!patLogin.token, '5. Patient Login and JWT issuance');
  assert(patLogin.user.role === 'PATIENT', '6. Patient role verification');
  const patToken = patLogin.token;
  const patProfileId = patLogin.user.patientProfileId;

  // 4. Patient Dashboard Data
  const patDash = await fetch(`${API}/patients/dashboard`, {
    headers: { Authorization: `Bearer ${patToken}` },
  }).then((r) => r.json());
  assert(patDash.success === true && patDash.data.profile.id === patProfileId, '7. Patient Dashboard retrieval');

  // 5. Doctor Dashboard Data
  const docDash = await fetch(`${API}/doctors/dashboard`, {
    headers: { Authorization: `Bearer ${docToken}` },
  }).then((r) => r.json());
  assert(docDash.success === true && docDash.data.doctor.id === docProfileId, '8. Doctor Command Center retrieval');

  // 6. Save a Contactless Screening (Simulating real rPPG camera extraction session)
  const scanPayload = {
    estimatedHeartRate: 74.5,
    stressLevel: 'LOW',
    riskLevel: 'NORMAL',
    faceQuality: 92,
    signalQuality: 88,
    confidence: 86,
    scanDuration: 15,
    algorithmVersion: 'v1.2-rPPG-Chrominance',
    waveformData: [0.1, 0.4, 0.8, 0.5, -0.2, -0.6, -0.1, 0.3],
  };
  const saveScanRes = await fetch(`${API}/scans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patToken}` },
    body: JSON.stringify(scanPayload),
  }).then((r) => r.json());
  assert(saveScanRes.success === true && saveScanRes.scan.estimatedHeartRate === 74.5, '9. Contactless Face Scan record persistence');
  assert(!!saveScanRes.disclaimer, '10. Scan response incorporates medical safety disclaimer');

  // 7. High-Risk Screening Alert Flow
  const elevatedScan = {
    estimatedHeartRate: 128.0, // Tachycardic range
    stressLevel: 'HIGH',
    faceQuality: 90,
    signalQuality: 85,
    confidence: 82,
    scanDuration: 15,
  };
  const elevatedRes = await fetch(`${API}/scans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patToken}` },
    body: JSON.stringify(elevatedScan),
  }).then((r) => r.json());
  assert(elevatedRes.scan.riskLevel === 'HIGH_RISK', '11. High-risk screening pattern classification');

  // 8. Retrieve Scans
  const myScans = await fetch(`${API}/scans`, {
    headers: { Authorization: `Bearer ${patToken}` },
  }).then((r) => r.json());
  assert(myScans.success === true && myScans.scans.length >= 2, '12. Scan History list retrieval');

  // 9. AI Health Analysis API
  const aiAnalysis = await fetch(`${API}/ai/analysis?timeRange=30`, {
    headers: { Authorization: `Bearer ${patToken}` },
  }).then((r) => r.json());
  assert(aiAnalysis.success === true && aiAnalysis.data.totalScans >= 2, '13. AI Health Analysis data aggregation');
  assert(!!aiAnalysis.data.aiSummary.summary, '14. AI Clinical Decision Support summary generation');

  // 10. Multilingual Voice Triage API (English, Tamil, Hindi)
  const triageEn = await fetch(`${API}/triage/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patToken}` },
    body: JSON.stringify({ transcript: 'I feel slight dizziness and tiredness after working outside', language: 'en' }),
  }).then((r) => r.json());
  assert(triageEn.success === true && triageEn.result.urgency === 'MEDICAL_ATTENTION', '15. English Voice Triage symptom evaluation');

  const triageTa = await fetch(`${API}/triage/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patToken}` },
    body: JSON.stringify({ transcript: 'எனக்கு லேசான காய்ச்சல் மற்றும் தலைவலி உள்ளது', language: 'ta' }),
  }).then((r) => r.json());
  assert(triageTa.success === true && triageTa.result.urgency === 'MEDICAL_ATTENTION', '16. Tamil Voice Triage symptom evaluation');

  const triageHi = await fetch(`${API}/triage/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patToken}` },
    body: JSON.stringify({ transcript: 'मुझे दो दिन से बुखार और सिरदर्द है', language: 'hi' }),
  }).then((r) => r.json());
  assert(triageHi.success === true && triageHi.result.urgency === 'MEDICAL_ATTENTION', '17. Hindi Voice Triage symptom evaluation');

  // 11. Book Telemedicine Appointment
  const today = new Date();
  today.setDate(today.getDate() + 2);
  const apptDate = today.toISOString().split('T')[0];

  const apptRes = await fetch(`${API}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patToken}` },
    body: JSON.stringify({
      doctorId: docProfileId,
      appointmentDate: apptDate,
      startTime: '11:00',
      endTime: '11:30',
      type: 'VIDEO',
      reason: 'Routine cardiovascular wellness and contactless screening review',
    }),
  }).then((r) => r.json());
  assert(apptRes.success === true && apptRes.appointment.status === 'PENDING', '18. Appointment Booking creation');
  const appointmentId = apptRes.appointment.id;

  // 12. Doctor Confirms Appointment
  const updateAppt = await fetch(`${API}/appointments/${appointmentId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${docToken}` },
    body: JSON.stringify({ status: 'CONFIRMED' }),
  }).then((r) => r.json());
  assert(updateAppt.success === true && updateAppt.appointment.status === 'CONFIRMED', '19. Doctor Appointment confirmation');

  // 13. Video Consultation Room Retrieval
  const roomRes = await fetch(`${API}/appointments/${appointmentId}/room`, {
    headers: { Authorization: `Bearer ${patToken}` },
  }).then((r) => r.json());
  assert(roomRes.success === true && !!roomRes.room.videoRoomId, '20. Private Video Consultation room verification');

  // 14. Doctor Issues E-Prescription
  const rxRes = await fetch(`${API}/prescriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${docToken}` },
    body: JSON.stringify({
      patientId: patProfileId,
      appointmentId,
      clinicalNotes: 'Maintain adequate hydration and record morning rPPG scans.',
      followUpDate: '2026-10-15',
      items: [
        { medicationName: 'Magnesium Glycinate', dosage: '200mg', frequency: 'Once daily at bedtime', durationDays: 30 },
      ],
    }),
  }).then((r) => r.json());
  assert(rxRes.success === true && rxRes.prescription.items.length === 1, '21. Doctor E-Prescription issuance');

  // 15. Medication Adherence Calculation
  const medsRes = await fetch(`${API}/medications`, {
    headers: { Authorization: `Bearer ${patToken}` },
  }).then((r) => r.json());
  assert(medsRes.success === true && medsRes.medications.length >= 1, '22. Active Patient Medication retrieval');
  assert(typeof medsRes.adherence.rate === 'number', '23. Real mathematical adherence percentage calculation');

  // 16. Health Timeline
  const timelineRes = await fetch(`${API}/timeline`, {
    headers: { Authorization: `Bearer ${patToken}` },
  }).then((r) => r.json());
  assert(timelineRes.success === true && timelineRes.events.length >= 3, '24. Chronological Health Timeline aggregation');

  // 17. Doctor Private Note (Hidden from patient)
  const noteRes = await fetch(`${API}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${docToken}` },
    body: JSON.stringify({
      patientId: patProfileId,
      title: 'Confidential Hemodynamic Impression',
      content: 'Baseline contactless screening within customary ranges. Patient instructed on hydration.',
    }),
  }).then((r) => r.json());
  assert(noteRes.success === true && noteRes.note.isPrivate === true, '25. Doctor Private Note created');

  // 18. Patient Detail Dossier for Doctor
  const dossierRes = await fetch(`${API}/patients/${patProfileId}`, {
    headers: { Authorization: `Bearer ${docToken}` },
  }).then((r) => r.json());
  assert(dossierRes.success === true && dossierRes.patient.doctorNotes.length >= 1, '26. Doctor views authorized patient dossier with private notes');

  // 19. Notifications
  const notifRes = await fetch(`${API}/notifications`, {
    headers: { Authorization: `Bearer ${patToken}` },
  }).then((r) => r.json());
  assert(notifRes.success === true && notifRes.notifications.length >= 1, '27. In-app notifications delivery');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================');

  if (passed === total) {
    console.log('ALL CLINICAL E2E WORKFLOW TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
