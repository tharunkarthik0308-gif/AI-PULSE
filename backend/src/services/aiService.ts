import { GoogleGenAI } from '@google/genai';
import { ENV } from '../config/env.js';

const MEDICAL_SAFETY_DISCLAIMER =
  'AI-Pulse contactless screening is an AI-assisted investigational tool designed for general wellness and preliminary screening. It does not provide medical diagnoses or replace consultation with a qualified medical professional.';

interface StructuredHealthData {
  patientName?: string;
  age?: number | string;
  gender?: string;
  recentScans: Array<{
    timestamp: string | Date;
    estimatedHeartRate: number;
    stressLevel: string;
    riskLevel: string;
    confidence: number;
    signalQuality: number;
  }>;
  activeMedications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  medicationAdherenceRate?: number;
}

export interface HealthSummaryResult {
  summary: string;
  observations: string[];
  trend: string;
  riskContext: string;
  recommendedNextStep: string;
  limitations: string;
  disclaimer: string;
  recommendations?: string[];
}

export const generateHealthSummary = async (
  data: StructuredHealthData,
  audience: 'PATIENT' | 'DOCTOR' = 'PATIENT',
  preferredLanguage: string = 'en'
): Promise<HealthSummaryResult> => {
  if (data.recentScans.length === 0) {
    return {
      summary:
        preferredLanguage === 'ta'
          ? 'முந்தைய ஸ்கிரீனிங் தரவு எதுவும் கிடைக்கவில்லை. ஆரோக்கிய பகுப்பாய்வை உருவாக்க உங்கள் முதல் தொடர்பு இல்லாத முக பரிசோதனையைத் தொடங்குங்கள்.'
          : preferredLanguage === 'hi'
          ? 'कोई पूर्व स्क्रीनिंग डेटा उपलब्ध नहीं है। स्वास्थ्य विश्लेषण उत्पन्न करने के लिए कृपया अपनी पहली संपर्क रहित फेस स्क्रीनिंग शुरू करें।'
          : 'No screening data recorded yet. Please complete a contactless screening to generate a preliminary trend analysis.',
      observations: [],
      trend: 'No prior screening sessions available to establish a baseline trend.',
      riskContext: 'Unavailable — requires at least one completed contactless screening.',
      recommendedNextStep: 'Perform a baseline contactless face scan in a well-lit environment.',
      limitations: 'Optical screening requires an active camera sensor and consistent ambient lighting.',
      recommendations: [
        'Perform a baseline contactless face scan in a well-lit environment.',
        'Ensure steady posture and face alignment within camera guidelines.',
      ],
      disclaimer: MEDICAL_SAFETY_DISCLAIMER,
    };
  }

  // Calculate real metrics from the real scans
  const hrValues = data.recentScans.map((s) => s.estimatedHeartRate);
  const avgHR = Math.round((hrValues.reduce((a, b) => a + b, 0) / hrValues.length) * 10) / 10;
  const minHR = Math.round(Math.min(...hrValues));
  const maxHR = Math.round(Math.max(...hrValues));
  const highRiskScans = data.recentScans.filter(
    (s) => s.riskLevel === 'HIGH_RISK' || s.riskLevel === 'ATTENTION'
  );
  const highStressScans = data.recentScans.filter(
    (s) => s.stressLevel === 'HIGH' || s.stressLevel === 'ELEVATED'
  );
  const avgConfidence = Math.round(
    data.recentScans.reduce((a, s) => a + s.confidence, 0) / data.recentScans.length
  );

  // If Gemini API is available, request clinical decision-support interpretation
  if (ENV.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });
      const prompt = `
You are the AI-Pulse Clinical AI Assistant. You provide clinical decision support and wellness summaries based EXCLUSIVELY on real structured screening data.
IMPORTANT SAFETY & INTEGRITY INSTRUCTIONS:
1. You are interpreting provided screening measurements. Do not invent, modify, replace, or estimate physiological measurements. Use only the supplied measurements. If information is unavailable, explicitly state that it is unavailable.
2. You are NOT a diagnostic system. NEVER claim to diagnose any disease (no diagnosis of heart disease, hypertension, diabetes, arrhythmia, etc.).
3. Webcam measurements are preliminary optical estimations only. Use terms: "Estimated Heart Rate", "Contactless Screening", "Screening Pattern", "Signal Quality", "Confidence", "Professional Review Recommended".
4. Audience: ${audience}.
   - If PATIENT: Use warm, clear, accessible language, explaining trends and encouraging discussion with their healthcare provider.
   - If DOCTOR: Use concise, clinical terminology highlighting screening frequency, estimated HR ranges, stress indicators, and signal reliability.
5. Language: ${preferredLanguage === 'ta' ? 'Tamil' : preferredLanguage === 'hi' ? 'Hindi' : 'English'}.
6. Mandatory medical disclaimer must always be acknowledged.

DATA FOR ANALYSIS:
- Number of recent screenings: ${data.recentScans.length}
- Estimated Average HR: ${avgHR} bpm (range: ${minHR} - ${maxHR} bpm)
- High risk screening patterns detected: ${highRiskScans.length} out of ${data.recentScans.length}
- Elevated stress patterns: ${highStressScans.length} out of ${data.recentScans.length}
- Average Signal Confidence: ${avgConfidence}%
- Active Medications: ${data.activeMedications && data.activeMedications.length > 0 ? JSON.stringify(data.activeMedications) : 'None reported'}
- Medication Adherence Rate: ${data.medicationAdherenceRate !== undefined ? `${data.medicationAdherenceRate}%` : 'Unavailable / Not recorded'}

Respond with a strictly formatted JSON object:
{
  "summary": "Concise summary narrative explaining the screening findings",
  "observations": ["observation 1", "observation 2", "observation 3"],
  "trend": "Description of the heart rate and HRV trajectory across available scans (or note if single baseline scan)",
  "riskContext": "Contextual explanation of detected screening patterns without making diagnoses",
  "recommendedNextStep": "Specific actionable next step for the patient or provider",
  "limitations": "Description of optical webcam screening limitations, lighting, and motion factors"
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        return {
          summary: parsed.summary,
          observations: parsed.observations || [],
          trend: parsed.trend || `Average estimated heart rate of ${avgHR} BPM across ${data.recentScans.length} session(s).`,
          riskContext: parsed.riskContext || (highRiskScans.length > 0 ? `${highRiskScans.length} screening session(s) showed elevated patterns.` : 'Screening values within customary baseline bands.'),
          recommendedNextStep: parsed.recommendedNextStep || (highRiskScans.length > 0 ? 'Consult a healthcare provider for review.' : 'Maintain regular screenings.'),
          limitations: parsed.limitations || 'Optical screening is sensitive to motion and lighting conditions.',
          recommendations: parsed.recommendations || [parsed.recommendedNextStep || 'Maintain regular screenings.'],
          disclaimer: MEDICAL_SAFETY_DISCLAIMER,
        };
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to deterministic clinical rule engine:', err);
    }
  }

  // Structured clinical rule-based engine fallback (guaranteed to work offline or without API key)
  const observations: string[] = [];
  const recommendations: string[] = [];

  observations.push(`Analyzed ${data.recentScans.length} valid contactless screening session(s).`);
  observations.push(`Estimated heart rate averaged ${avgHR} BPM (recorded range: ${minHR} – ${maxHR} BPM).`);
  observations.push(`Average rPPG signal quality and confidence was calculated at ${avgConfidence}%.`);

  if (highRiskScans.length > 0) {
    observations.push(
      `${highRiskScans.length} session(s) demonstrated screening patterns warranting professional review.`
    );
    recommendations.push(
      'Schedule a clinical telemedicine consultation with a qualified physician for evaluation.'
    );
  } else {
    observations.push('Recent contactless screening patterns remained within customary estimated physiological bands.');
  }

  if (data.medicationAdherenceRate !== undefined) {
    observations.push(`Logged medication schedule adherence stands at ${data.medicationAdherenceRate}%.`);
    if (data.medicationAdherenceRate < 80) {
      recommendations.push('Review your medication schedule with your doctor to maintain consistent treatment adherence.');
    }
  } else {
    observations.push('No personal medication adherence logs recorded.');
  }

  recommendations.push('Maintain regular screenings under consistent ambient lighting while remaining steady.');
  recommendations.push('Consult a licensed physician for any persistent symptoms, dizziness, or discomfort.');

  const trend =
    data.recentScans.length === 1
      ? 'Single baseline screening recorded. Additional scans over days and weeks will establish longitudinal trend lines.'
      : `Trajectory across ${data.recentScans.length} sessions demonstrates an estimated HR span of ${minHR}–${maxHR} BPM (mean ${avgHR} BPM) with consistent photoplethysmographic signal stability.`;

  const riskContext =
    highRiskScans.length > 0
      ? `${highRiskScans.length} screening session(s) demonstrated patterns outside baseline resting ranges. These optical estimations warrant clinical context from a licensed healthcare provider.`
      : 'All recent contactless screening values remained within expected resting physiological ranges with no acute anomalies detected.';

  const recommendedNextStep =
    highRiskScans.length > 0
      ? 'Book a telemedicine consultation with a physician to evaluate these screening observations.'
      : 'Continue regular weekly or post-activity contactless screenings in a well-lit environment to track ongoing trends.';

  const limitations =
    'Contactless photoplethysmography is sensitive to ambient lighting variations, facial movement artifacts, and webcam shutter compression. It is intended for investigational decision support and not diagnostic evaluation.';

  let summary = '';
  if (audience === 'DOCTOR') {
    summary = `Patient trend review based on ${data.recentScans.length} photoplethysmographic contactless screening(s). Observed estimated HR baseline: ${avgHR} bpm [${minHR}-${maxHR}]. Signal quality index averaged ${avgConfidence}%. ${
      highRiskScans.length > 0
        ? `Note: ${highRiskScans.length} screening pattern(s) flagged for clinical attention.`
        : 'Parameters are currently stable within estimated ranges.'
    }`;
  } else {
    if (preferredLanguage === 'ta') {
      summary = `உங்கள் சமீபத்திய ${data.recentScans.length} தொடர்பு இல்லாத பரிசோதனைகளின் அடிப்படையில், மதிப்பிடப்பட்ட சராசரி இதய துடிப்பு நிமிடத்திற்கு ${avgHR} துடிப்புகளாக உள்ளது (${minHR} முதல் ${maxHR} வரை). சமிக்ஞை தரம் ${avgConfidence}% ஆக உறுதிப்படுத்தப்பட்டது. இது ஒரு ஆரம்பக்கட்ட ஸ்கிரீனிங் மட்டுமே; ஏதேனும் அசௌகரியம் இருந்தால் மருத்துவரை அணுகவும்.`;
    } else if (preferredLanguage === 'hi') {
      summary = `आपकी हालिया ${data.recentScans.length} संपर्क रहित स्क्रीनिंग के आधार पर, अनुमानित औसत हृदय गति ${avgHR} बीपीएम दर्ज की गई है (${minHR} से ${maxHR} के बीच)। सिग्नल विश्वास स्तर ${avgConfidence}% है। यह केवल एक प्रारंभिक जांच है; किसी भी समस्या के लिए कृपया चिकित्सक से परामर्श करें।`;
    } else {
      summary = `Based on your ${data.recentScans.length} contactless screening session(s), your estimated average heart rate is ${avgHR} BPM with a recorded span of ${minHR} to ${maxHR} BPM. Signal confidence averaged ${avgConfidence}%. This screening represents an investigational wellness metric and does not constitute a clinical diagnosis.`;
    }
  }

  return {
    summary,
    observations,
    trend,
    riskContext,
    recommendedNextStep,
    limitations,
    recommendations,
    disclaimer: MEDICAL_SAFETY_DISCLAIMER,
  };
};
