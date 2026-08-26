export type BodySide = 'left' | 'right';

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseFrame {
  version: 1;
  sequence: number;
  timestampMs: number;
  landmarks: PoseLandmark[];
}

export type SquatPhase =
  | 'finding-subject'
  | 'standing'
  | 'descending'
  | 'bottom'
  | 'ascending';

export type CaptureIssue =
  | 'missing-landmarks'
  | 'low-visibility'
  | 'stream-interrupted';

export interface CaptureQuality {
  valid: boolean;
  score: number;
  side?: BodySide;
  issue?: CaptureIssue;
}

export interface SquatMetrics {
  kneeAngle: number;
  trunkLean: number;
  kneeAsymmetry?: number;
  kneeDistanceRatio?: number;
  leftValgusPercent?: number;
  rightValgusPercent?: number;
  pelvisTiltDeg?: number;
  shoulderTiltDeg?: number;
  centerShiftPercent?: number;
}

export interface PythonSquatAnalysis {
  type: 'squat-analysis-v1';
  sequence: number;
  timestampMs: number;
  quality: { valid: boolean; score: number; issue?: string };
  metrics: null | {
    leftKneeAngle: number;
    rightKneeAngle: number;
    averageKneeAngle: number;
    kneeAngleAsymmetry: number;
    kneeDistanceRatio: number;
    leftValgusPercent: number;
    rightValgusPercent: number;
    pelvisTiltDeg: number;
    shoulderTiltDeg: number;
    trunkLateralLeanDeg: number;
    centerShiftPercent: number;
  };
  analysis: {
    motion: string;
    depthProgress: number;
    symmetryScore: number;
    warnings: string[];
  };
}

export interface SquatAnalysisState {
  phase: SquatPhase;
  repetitions: number;
  stableFrames: number;
  totalFrames: number;
  validFrames: number;
  lastTimestampMs?: number;
  smoothedKneeAngle?: number;
  metrics?: SquatMetrics;
  analysisWarnings?: string[];
  quality: CaptureQuality;
}

export interface SquatEngineConfig {
  minVisibility: number;
  stableFramesRequired: number;
  standingEnterAngle: number;
  standingExitAngle: number;
  bottomEnterAngle: number;
  bottomExitAngle: number;
  maxFrameGapMs: number;
  smoothingAlpha: number;
}
