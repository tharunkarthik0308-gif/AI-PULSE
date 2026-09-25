export interface RppgScanInput {
  estimatedHeartRate: number;
  stressLevel?: string;
  riskLevel?: string;
  faceQuality: number;
  signalQuality: number;
  confidence: number;
  scanDuration: number;
  algorithmVersion?: string;
  waveformData?: string;
}

export const validateAndClassifyScan = (input: RppgScanInput) => {
  // Clamp & sanitize
  const hr = Math.round(Number(input.estimatedHeartRate) * 10) / 10;
  const faceQuality = Math.min(100, Math.max(0, Math.round(Number(input.faceQuality))));
  const signalQuality = Math.min(100, Math.max(0, Math.round(Number(input.signalQuality))));
  const confidence = Math.min(100, Math.max(0, Math.round(Number(input.confidence))));
  const scanDuration = Math.max(5, Math.round(Number(input.scanDuration) || 15));

  // Determine stress classification if not already determined by client rPPG RMSSD
  let stressLevel = input.stressLevel || 'LOW';
  if (!['LOW', 'MODERATE', 'ELEVATED', 'HIGH'].includes(stressLevel)) {
    if (hr > 105) stressLevel = 'ELEVATED';
    else if (hr > 90) stressLevel = 'MODERATE';
    else stressLevel = 'LOW';
  }

  // Determine screening risk classification (Screening pattern, NOT diagnosis)
  let riskLevel = 'NORMAL';
  if (confidence >= 60) {
    if (hr > 120 || hr < 50) {
      riskLevel = 'HIGH_RISK';
    } else if (hr > 100 || hr < 55) {
      riskLevel = 'ATTENTION';
    } else if (hr > 90 || stressLevel === 'HIGH') {
      riskLevel = 'EVALUATE';
    } else {
      riskLevel = 'NORMAL';
    }
  } else {
    // Low confidence signal cannot establish high risk, marked as evaluate/low confidence
    riskLevel = 'EVALUATE';
  }

  return {
    estimatedHeartRate: hr,
    stressLevel,
    riskLevel,
    faceQuality,
    signalQuality,
    confidence,
    scanDuration,
    algorithmVersion: input.algorithmVersion || 'v1.0-rPPG-Greenshift',
    waveformData: input.waveformData || null,
  };
};
