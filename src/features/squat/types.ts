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
