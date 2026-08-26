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
  issue?: CaptureIssue;
}

export interface SquatMetrics {
  kneeAngle: number;
  depthPercent?: number;
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
  timelinePoint?: null | {
    second: number;
    kneeDistanceRatio: number;
    kneeAngleAsymmetry: number;
    centerShiftPercent: number;
    maxValgusPercent: number;
  };
}

export interface FrontendSquatUpdate {
  type: 'frontend-squat-state-v1';
  phase: SquatPhase;
  repetitions: number;
  kneeAngle: number;
  depthPercent?: number;
  totalFrames: number;
  validFrames: number;
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
