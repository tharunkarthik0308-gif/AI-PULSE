import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export type ScanState =
  | 'IDLE'
  | 'INITIALIZING_CAMERA'
  | 'PERMISSION_REQUIRED'
  | 'CAMERA_UNAVAILABLE'
  | 'SEARCHING_FACE'
  | 'ALIGN_FACE'
  | 'FACE_TOO_FAR'
  | 'FACE_TOO_CLOSE'
  | 'POOR_LIGHTING'
  | 'HOLD_STILL'
  | 'COLLECTING_SIGNAL'
  | 'PROCESSING'
  | 'COMPLETE'
  | 'SAVED'
  | 'ERROR';

export interface VitalsResult {
  estimatedHeartRate: number;
  stressLevel: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';
  riskLevel: 'NORMAL' | 'EVALUATE' | 'ATTENTION' | 'HIGH_RISK';
  faceQuality: number;
  signalQuality: number;
  confidence: number;
  scanDuration: number;
  waveformData: number[];
}

declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
  }
}

export const useRppgScanner = () => {
  const [scanState, setScanState] = useState<ScanState>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to start contactless screening');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  // Vitals & Metrics derived strictly from real camera rPPG frames
  const [estimatedHeartRate, setEstimatedHeartRate] = useState<number | null>(null);
  const [stressLevel, setStressLevel] = useState<'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH'>('LOW');
  const [riskLevel, setRiskLevel] = useState<'NORMAL' | 'EVALUATE' | 'ATTENTION' | 'HIGH_RISK'>('NORMAL');
  const [faceQuality, setFaceQuality] = useState<number>(0);
  const [signalQuality, setSignalQuality] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const [pulseWaveform, setPulseWaveform] = useState<number[]>([]);

  // Refs for camera and animation
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<any>(null);

  // Signal extraction buffers
  const rawSignalBuffer = useRef<number[]>([]);
  const timestampsBuffer = useRef<number[]>([]);
  const detectedPeaksRef = useRef<number[]>([]);
  const lastLandmarkRef = useRef<{ x: number; y: number } | null>(null);
  const latestForeheadRoiRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const scanStartTimeRef = useRef<number>(0);
  const signalQualityRef = useRef<number>(0);
  const estimatedHeartRateRef = useRef<number | null>(null);
  const totalTargetFrames = 450; // ~15 seconds at 30 fps

  // Clean up media and loops
  const stopScan = useCallback(() => {
    setIsScanning(false);
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setScanState('IDLE');
    setStatusMessage('Screening paused');
  }, []);

  const recalibrate = useCallback(() => {
    rawSignalBuffer.current = [];
    timestampsBuffer.current = [];
    detectedPeaksRef.current = [];
    signalQualityRef.current = 0;
    estimatedHeartRateRef.current = null;
    setProgress(0);
    setEstimatedHeartRate(null);
    setSignalQuality(0);
    setConfidence(0);
    setPulseWaveform([]);
    setScanState('COLLECTING_SIGNAL');
    setStatusMessage('Recalibrating signal... Keep face steady');
    scanStartTimeRef.current = Date.now();
  }, []);

  // Process rPPG signal on collected buffer
  const processSignal = useCallback(() => {
    const raw = rawSignalBuffer.current;
    const timestamps = timestampsBuffer.current;
    if (raw.length < 60) return; // Need at least 2 seconds

    // 1. Moving Average High-pass Detrending (Window = 30 samples / ~1 sec)
    const windowSize = 30;
    const detrended: number[] = [];
    for (let i = 0; i < raw.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(raw.length, i + Math.floor(windowSize / 2));
      let sum = 0;
      for (let j = start; j < end; j++) sum += raw[j];
      const mean = sum / (end - start);
      detrended.push(raw[i] - mean);
    }

    // 2. Moving Average Low-pass Smoothing (Window = 5 samples)
    const smoothed: number[] = [];
    for (let i = 0; i < detrended.length; i++) {
      const start = Math.max(0, i - 2);
      const end = Math.min(detrended.length, i + 3);
      let sum = 0;
      for (let j = start; j < end; j++) sum += detrended[j];
      smoothed.push(sum / (end - start));
    }

    // Update real-time waveform display with the latest normalized window
    const recentWindow = smoothed.slice(-100);
    if (recentWindow.length > 0) {
      const minVal = Math.min(...recentWindow);
      const maxVal = Math.max(...recentWindow);
      const range = maxVal - minVal || 1;
      const normalizedWaveform = recentWindow.map((v) => ((v - minVal) / range) * 2 - 1);
      setPulseWaveform(normalizedWaveform);
    }

    // 3. Peak Detection with physiological refractory limit
    // Max 210 bpm = min 0.285s between beats
    // At ~30fps, min distance between peaks is 9 frames
    const minPeakDistance = 9;
    const peaks: number[] = [];
    let threshold = 0;
    for (let i = 0; i < smoothed.length; i++) {
      threshold += Math.abs(smoothed[i]);
    }
    threshold = (threshold / smoothed.length) * 0.4;

    for (let i = 2; i < smoothed.length - 2; i++) {
      if (
        smoothed[i] > threshold &&
        smoothed[i] > smoothed[i - 1] &&
        smoothed[i] > smoothed[i - 2] &&
        smoothed[i] > smoothed[i + 1] &&
        smoothed[i] > smoothed[i + 2]
      ) {
        if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minPeakDistance) {
          peaks.push(i);
        }
      }
    }

    detectedPeaksRef.current = peaks;

    // 4. Inter-Beat Interval (IBI) Calculation
    if (peaks.length >= 3) {
      const ibis: number[] = [];
      for (let k = 1; k < peaks.length; k++) {
        const t1 = timestamps[peaks[k - 1]];
        const t2 = timestamps[peaks[k]];
        const ibiSeconds = (t2 - t1) / 1000;
        // Physiological validity check for IBI: 0.3s to 1.33s (45 to 200 BPM)
        if (ibiSeconds >= 0.3 && ibiSeconds <= 1.33) {
          ibis.push(ibiSeconds);
        }
      }

      if (ibis.length >= 2) {
        const meanIbi = ibis.reduce((a, b) => a + b, 0) / ibis.length;
        const calculatedHR = Math.round((60 / meanIbi) * 10) / 10;

        // Bounded physiological sanity check
        if (calculatedHR >= 45 && calculatedHR <= 190) {
          estimatedHeartRateRef.current = calculatedHR;
          setEstimatedHeartRate(calculatedHR);

          // RMSSD calculation for Stress Level Estimation
          let ssdSum = 0;
          for (let m = 1; m < ibis.length; m++) {
            const diff = ibis[m] - ibis[m - 1];
            ssdSum += diff * diff;
          }
          const rmssdMs = Math.sqrt(ssdSum / (ibis.length - 1)) * 1000;

          // Clinical HRV rule: Higher RMSSD (> 45ms) corresponds to lower stress
          let stress: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' = 'LOW';
          if (rmssdMs < 20 || calculatedHR > 105) {
            stress = 'HIGH';
          } else if (rmssdMs < 32 || calculatedHR > 95) {
            stress = 'ELEVATED';
          } else if (rmssdMs < 45 || calculatedHR > 85) {
            stress = 'MODERATE';
          } else {
            stress = 'LOW';
          }
          setStressLevel(stress);

          // Signal Quality & Confidence Calculation
          // IBI consistency (Standard deviation of IBIs)
          const variance =
            ibis.reduce((acc, val) => acc + Math.pow(val - meanIbi, 2), 0) / ibis.length;
          const stdDev = Math.sqrt(variance);
          const coeffOfVariation = stdDev / meanIbi; // Lower is more consistent arterial rhythm

          const sqi = Math.max(20, Math.min(98, Math.round((1 - coeffOfVariation * 1.5) * 100)));
          signalQualityRef.current = sqi;
          setSignalQuality(sqi);
          setConfidence(Math.round(sqi * 0.95));

          // Risk level screening pattern classification
          if (calculatedHR > 120 || calculatedHR < 50) {
            setRiskLevel('HIGH_RISK');
          } else if (calculatedHR > 100 || calculatedHR < 55) {
            setRiskLevel('ATTENTION');
          } else if (calculatedHR > 90 || stress === 'HIGH') {
            setRiskLevel('EVALUATE');
          } else {
            setRiskLevel('NORMAL');
          }
        }
      }
    }
  }, []);

  // Frame sampling loop
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animFrameId.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw current camera frame to offscreen/analysis canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const roi = latestForeheadRoiRef.current;
    if (roi && roi.width > 10 && roi.height > 10) {
      try {
        const frameData = ctx.getImageData(roi.x, roi.y, roi.width, roi.height);
        const data = frameData.data;

        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        const pixelCount = data.length / 4;

        for (let p = 0; p < data.length; p += 4) {
          totalR += data[p];
          totalG += data[p + 1];
          totalB += data[p + 2];
        }

        const avgR = totalR / pixelCount;
        const avgG = totalG / pixelCount;
        const avgB = totalB / pixelCount;
        const brightness = (avgR + avgG + avgB) / 3;

        // Illumination validation
        if (brightness < 35 || brightness > 245) {
          setScanState('POOR_LIGHTING');
          setStatusMessage('Lighting insufficient. Please increase ambient light.');
          setSignalQuality(15);
        } else {
          // Green-channel differential signal with chrominance enhancement (2G - R - B)
          // Cancels out ambient motion & illumination artifacts
          const chrominanceSignal = 2 * avgG - avgR - avgB;

          rawSignalBuffer.current.push(chrominanceSignal);
          timestampsBuffer.current.push(Date.now());

          // Keep maximum 600 samples (~20 seconds)
          if (rawSignalBuffer.current.length > 600) {
            rawSignalBuffer.current.shift();
            timestampsBuffer.current.shift();
          }

          // Update scan progress
          const currentCount = rawSignalBuffer.current.length;
          const currentPct = Math.min(100, Math.round((currentCount / totalTargetFrames) * 100));
          setProgress(currentPct);

          if (currentPct >= 100) {
            if (signalQualityRef.current < 35 || !estimatedHeartRateRef.current) {
              setScanState('HOLD_STILL');
              setStatusMessage('Insufficient signal quality. Please remain still and improve lighting before continuing.');
            } else {
              setScanState('COMPLETE');
              setStatusMessage('Contactless screening complete. Review your estimated vitals.');
            }
          } else {
            setScanState('COLLECTING_SIGNAL');
            setStatusMessage('Collecting pulse signal... Keep face steady');
          }

          // Process signal periodically
          if (rawSignalBuffer.current.length % 10 === 0) {
            processSignal();
          }
        }
      } catch (err) {
        console.warn('Frame ROI extraction error:', err);
      }
    }

    animFrameId.current = requestAnimationFrame(processFrame);
  }, [processSignal]);

  // Start the scan
  const startScan = async () => {
    try {
      setScanState('INITIALIZING_CAMERA');
      setStatusMessage('Requesting camera sensor access...');
      setIsScanning(true);
      setProgress(0);
      setEstimatedHeartRate(null);
      setPulseWaveform([]);
      rawSignalBuffer.current = [];
      timestampsBuffer.current = [];
      scanStartTimeRef.current = Date.now();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Initialize MediaPipe FaceMesh
      if (window.FaceMesh) {
        const faceMesh = new window.FaceMesh({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.65,
          minTrackingConfidence: 0.65,
        });

        faceMesh.onResults((results: any) => {
          if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            setScanState('SEARCHING_FACE');
            setStatusMessage('Searching for face in frame...');
            setFaceQuality(0);
            latestForeheadRoiRef.current = null;
            return;
          }

          const landmarks = results.multiFaceLandmarks[0];
          const canvas = canvasRef.current;
          if (!canvas) return;

          const width = canvas.width;
          const height = canvas.height;

          // Forehead ROI landmarks (Points: 10 = upper forehead center, 67, 109, 108, 151, 337, 297, 284)
          const foreheadPoints = [10, 67, 109, 108, 151, 337, 297, 284];
          let minX = width;
          let maxX = 0;
          let minY = height;
          let maxY = 0;

          foreheadPoints.forEach((idx) => {
            const p = landmarks[idx];
            if (p) {
              const px = p.x * width;
              const py = p.y * height;
              minX = Math.min(minX, px);
              maxX = Math.max(maxX, px);
              minY = Math.min(minY, py);
              maxY = Math.max(maxY, py);
            }
          });

          // Head stability analysis
          const noseTip = landmarks[1];
          if (noseTip && lastLandmarkRef.current) {
            const dx = Math.abs(noseTip.x * width - lastLandmarkRef.current.x);
            const dy = Math.abs(noseTip.y * height - lastLandmarkRef.current.y);
            const displacement = Math.sqrt(dx * dx + dy * dy);

            if (displacement > 12) {
              setScanState('HOLD_STILL');
              setStatusMessage('Excessive motion detected. Please hold still.');
              setFaceQuality(30);
            } else {
              setFaceQuality(92);
            }
          }
          if (noseTip) {
            lastLandmarkRef.current = { x: noseTip.x * width, y: noseTip.y * height };
          }

          // Distance estimation via face width
          const leftFace = landmarks[234];
          const rightFace = landmarks[454];
          if (leftFace && rightFace) {
            const faceWidth = Math.abs(rightFace.x - leftFace.x);
            if (faceWidth < 0.22) {
              setScanState('FACE_TOO_FAR');
              setStatusMessage('Move slightly closer to the camera.');
              return;
            } else if (faceWidth > 0.65) {
              setScanState('FACE_TOO_CLOSE');
              setStatusMessage('Move slightly farther away.');
              return;
            }
          }

          // Forehead ROI padding
          const roiX = Math.max(0, Math.floor(minX + (maxX - minX) * 0.1));
          const roiY = Math.max(0, Math.floor(minY));
          const roiW = Math.floor((maxX - minX) * 0.8);
          const roiH = Math.floor(Math.max(15, (maxY - minY) * 0.9));

          latestForeheadRoiRef.current = { x: roiX, y: roiY, width: roiW, height: roiH };
        });

        faceMeshRef.current = faceMesh;

        // Setup MediaPipe camera pump
        if (window.Camera && videoRef.current) {
          const camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (faceMeshRef.current && videoRef.current) {
                await faceMeshRef.current.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480,
          });
          camera.start();
        }
      }

      setScanState('COLLECTING_SIGNAL');
      setStatusMessage('Align your face. Collecting pulse signal...');

      // Start frame sampling loop
      animFrameId.current = requestAnimationFrame(processFrame);
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      if (err.name === 'NotAllowedError') {
        setScanState('PERMISSION_REQUIRED');
        setStatusMessage('Camera permission denied. Please allow camera access in browser settings.');
      } else {
        setScanState('CAMERA_UNAVAILABLE');
        setStatusMessage('Camera sensor unavailable. Ensure no other application is using it.');
      }
      setIsScanning(false);
    }
  };

  // Save the result to backend database
  const saveScanResult = async (): Promise<boolean> => {
    if (!estimatedHeartRate) {
      throw new Error('No valid estimated heart rate collected yet.');
    }

    const durationSeconds = Math.round((Date.now() - scanStartTimeRef.current) / 1000) || 15;

    const payload = {
      estimatedHeartRate,
      stressLevel,
      riskLevel,
      faceQuality,
      signalQuality,
      confidence,
      scanDuration: durationSeconds,
      algorithmVersion: 'v1.2-rPPG-Chrominance',
      waveformData: pulseWaveform.slice(-60),
    };

    setScanState('PROCESSING');
    setStatusMessage('Saving screening record to your profile...');

    const res = await api.saveScan(payload);
    if (res.success) {
      setScanState('SAVED');
      setStatusMessage('Screening saved successfully to your health record.');
      return true;
    } else {
      setScanState('ERROR');
      setStatusMessage('Failed to save screening to server.');
      return false;
    }
  };

  useEffect(() => {
    return () => {
      stopScan();
    };
  }, [stopScan]);

  return {
    videoRef,
    canvasRef,
    scanState,
    statusMessage,
    isScanning,
    progress,
    estimatedHeartRate,
    stressLevel,
    riskLevel,
    faceQuality,
    signalQuality,
    confidence,
    pulseWaveform,
    startScan,
    stopScan,
    recalibrate,
    saveScanResult,
  };
};
