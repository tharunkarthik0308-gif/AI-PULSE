import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { recordAuditLog } from '../services/auditService.js';

interface TriageResult {
  urgency: 'ROUTINE' | 'MEDICAL_ATTENTION' | 'URGENT_EVALUATION';
  urgencyLabel: string;
  symptomsDetected: string[];
  explanation: string;
  recommendedAction: string;
  disclaimer: string;
}

const MEDICAL_SAFETY_DISCLAIMER =
  'AI-Pulse Voice Triage is an AI-assisted preliminary symptom assessment tool. It does not provide medical diagnoses or replace emergency medical services or consultation with a qualified physician.';

// Clinical chest/cardiac symptom matcher: detects anatomical torso terms near pain/discomfort sensation terms in either direction
const CHEST_SYMPTOM_REGEX =
  /\b(?:chest|heart|sternum|substernal|retrosternal)\b[a-z\s,'-]{0,45}\b(?:pain|pains|pressure|tight|tightness|discomfort|heaviness|heavy|squeezing|crushing|burning|ache|aches|aching|hurt|hurts|hurting)\b|\b(?:pain|pains|pressure|tight|tightness|discomfort|heaviness|heavy|squeezing|crushing|burning|ache|aches|aching|hurt|hurts|hurting)\b[a-z\s,'-]{0,45}\b(?:chest|heart|sternum|substernal|retrosternal)\b/i;

export const evaluateTriage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { transcript, language = 'en' } = req.body;

    if (!transcript || typeof transcript !== 'string' || transcript.trim() === '') {
      res.status(400).json({ success: false, message: 'Speech transcript or symptom description is required.' });
      return;
    }

    const text = transcript.toLowerCase();

    // Critical urgent keywords across English, Tamil, and Hindi
    const urgentKeywords = [
      // English
      'chest pain', 'heart attack', 'cannot breathe', 'difficulty breathing', 'shortness of breath',
      'unconscious', 'fainted', 'sudden weakness', 'slurred speech', 'severe bleeding', 'seizure',
      'stroke', 'anaphylaxis', 'bluish lips',
      // Tamil (transliterated and script)
      'நெஞ்சு வலி', 'nenju vali', 'மூச்சு திணறல்', 'moochu thinare', 'மயக்கம்', 'mayakkam',
      // Hindi (transliterated and script)
      'सीने में दर्द', 'seene mein dard', 'सांस लेने में तकलीफ', 'saans lene mein takleef', 'बेहोश', 'behoshi'
    ];

    // Moderate attention keywords
    const attentionKeywords = [
      // English
      'high fever', 'persistent cough', 'vomiting', 'diarrhea', 'severe headache', 'migraine',
      'burning urination', 'rash', 'dizziness', 'palpitations', 'abdominal pain',
      // Tamil
      'காய்ச்சல்', 'kaichal', 'இருமல்', 'irumal', 'வாந்தி', 'vanthi', 'தலைவலி', 'thalaivali',
      // Hindi
      'बुखार', 'bukhar', 'खांसी', 'khansi', 'उल्टी', 'ulti', 'सिरदर्द', 'sirdard', 'चक्कर', 'chakkar'
    ];

    const detectedSymptoms: string[] = [];

    // Dedicated clinical chest/cardiac symptom matcher
    const hasChestSymptom = CHEST_SYMPTOM_REGEX.test(text);
    if (hasChestSymptom) {
      detectedSymptoms.push('Chest discomfort/pain');
    }

    // Check urgent keyword matches
    const matchedUrgent = urgentKeywords.filter((k) => text.includes(k));
    if (matchedUrgent.length > 0) {
      detectedSymptoms.push(...matchedUrgent);
    }
    const isUrgent = hasChestSymptom || matchedUrgent.length > 0;

    // Check moderate attention matches
    const matchedAttention = attentionKeywords.filter((k) => text.includes(k));
    if (matchedAttention.length > 0) {
      detectedSymptoms.push(...matchedAttention);
    }
    const isAttention = matchedAttention.length > 0;

    let urgency: 'ROUTINE' | 'MEDICAL_ATTENTION' | 'URGENT_EVALUATION' = 'ROUTINE';
    let urgencyLabel = 'Routine consultation';
    let explanation = '';
    let recommendedAction = '';

    if (isUrgent) {
      urgency = 'URGENT_EVALUATION';
      if (language === 'ta') {
        urgencyLabel = 'அவசர மருத்துவ மதிப்பீடு தேவை';
        explanation = 'உங்களுடைய அறிகுறிகளில் அவசர மருத்துவ கவனிப்பு தேவைப்படக்கூடிய அம்சங்கள் அடையாளம் காணப்பட்டுள்ளன.';
        recommendedAction = 'உடனடியாக அவசர சிகிச்சை பிரிவு அல்லது அவசர மருத்துவரை அணுகவும்.';
      } else if (language === 'hi') {
        urgencyLabel = 'तत्काल चिकित्सा मूल्यांकन आवश्यक';
        explanation = 'आपके लक्षणों में आपातकालीन चिकित्सा देखभाल की आवश्यकता वाले संकेत मिले हैं।';
        recommendedAction = 'कृपया तुरंत निकटतम आपातकालीन अस्पताल या चिकित्सक से संपर्क करें।';
      } else {
        urgencyLabel = 'Urgent professional evaluation';
        explanation = 'The described symptoms include red-flag indicators that require immediate clinical evaluation.';
        recommendedAction = 'Seek emergency medical evaluation or contact local urgent care services immediately.';
      }
    } else if (isAttention) {
      urgency = 'MEDICAL_ATTENTION';
      if (language === 'ta') {
        urgencyLabel = 'மருத்துவ கவனம் தேவை';
        explanation = 'அறிகுறிகள் தொடர்ந்து நீடித்தால் அல்லது தீவிரமடைந்தால் மருத்துவரிடம் பரிசோதிப்பது நல்லது.';
        recommendedAction = 'எங்கள் தகுதிவாய்ந்த மருத்துவரிடம் ஒரு டெலிமெடிசின் ஆலோசனை முன்பதிவு செய்யவும்.';
      } else if (language === 'hi') {
        urgencyLabel = 'चिकित्सा परामर्श की आवश्यकता';
        explanation = 'लक्षणों को देखते हुए किसी योग्य चिकित्सक द्वारा परीक्षण कराना उचित होगा।';
        recommendedAction = 'कृपया हमारे किसी चिकित्सक के साथ टेलीमेडिसिन अपॉइंटमेंट बुक करें।';
      } else {
        urgencyLabel = 'Needs medical attention';
        explanation = 'The symptoms suggest an active condition that warrants clinical review by a licensed healthcare professional.';
        recommendedAction = 'Schedule a video telemedicine consultation with a general practitioner or specialist.';
      }
    } else {
      urgency = 'ROUTINE';
      if (language === 'ta') {
        urgencyLabel = 'வழக்கமான ஆலோசனை';
        explanation = 'பதிவான அறிகுறிகளை கிடைக்கக்கூடிய விதிகளிலிருந்து துல்லியமாக வகைப்படுத்த முடியவில்லை. அறிகுறிகள் புதிதாகவோ அல்லது தீவிரமாகவோ இருந்தால் மருத்துவ பரிசோதனையை கருத்தில் கொள்ளுங்கள்.';
        recommendedAction = 'பொதுவான ஆரோக்கிய வழிகாட்டுதலுக்கு வழக்கமான ஆலோசனையைத் திட்டமிடுங்கள்.';
      } else if (language === 'hi') {
        urgencyLabel = 'नियमित परामर्श';
        explanation = 'उपलब्ध नियमों से दर्ज लक्षणों को निश्चित रूप से वर्गीकृत नहीं किया जा सका। यदि लक्षण नए या गंभीर हैं, तो कृपया चिकित्सकीय मूल्यांकन पर विचार करें।';
        recommendedAction = 'सामान्य स्वास्थ्य जांच के लिए नियमित परामर्श बुक कर सकते हैं।';
      } else {
        urgencyLabel = 'Routine consultation';
        explanation = 'AI-Pulse could not confidently classify the reported symptoms from the available symptom rules. Please consider a clinical evaluation, especially if symptoms are new, worsening, severe, or concerning.';
        recommendedAction = 'Book a routine wellness review or follow-up with your preferred physician.';
      }
    }

    const result: TriageResult = {
      urgency,
      urgencyLabel,
      symptomsDetected: detectedSymptoms.length > 0 ? detectedSymptoms : ['Non-specific wellness inquiry'],
      explanation,
      recommendedAction,
      disclaimer: MEDICAL_SAFETY_DISCLAIMER,
    };

    let sessionRecordId: string | undefined;

    // Persist triage session and timeline event if user is a logged-in patient
    if (req.user?.patientProfileId) {
      const session = await prisma.voiceTriageSession.create({
        data: {
          patientId: req.user.patientProfileId,
          language,
          rawTranscript: transcript.trim(),
          symptomsDetected: JSON.stringify(result.symptomsDetected),
          urgencyLevel: urgency,
          urgencyLabel,
          explanation,
          recommendedAction,
        },
      });
      sessionRecordId = session.id;

      // Add to health timeline
      await prisma.healthTimelineEvent.create({
        data: {
          patientId: req.user.patientProfileId,
          eventType: 'VOICE_TRIAGE',
          title: `Voice Triage: ${urgencyLabel}`,
          summary: `Urgency: ${urgency}. Symptoms: ${result.symptomsDetected.slice(0, 3).join(', ')}.`,
          referenceId: session.id,
        },
      });

      if (req.user?.userId) {
        await recordAuditLog({
          userId: req.user.userId,
          action: 'VOICE_TRIAGE_EVALUATION',
          resource: 'VoiceTriageSession',
          resourceId: session.id,
          ipAddress: req.ip || req.socket.remoteAddress || undefined,
          details: { urgency, language, symptoms: result.symptomsDetected },
        });
      }
    }

    res.json({ success: true, result, sessionId: sessionRecordId });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error performing triage assessment.', error: error.message });
  }
};

export const getMyTriageHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.patientProfileId) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const sessions = await prisma.voiceTriageSession.findMany({
      where: { patientId: req.user.patientProfileId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ success: true, sessions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving triage history.', error: error.message });
  }
};
