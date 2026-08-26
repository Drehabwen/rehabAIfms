import { calculateAngle } from '../../utils/angleUtils';
import type {
  BodySide,
  CaptureQuality,
  PoseFrame,
  PoseLandmark,
  SquatAnalysisState,
  SquatEngineConfig,
  SquatMetrics,
} from './types';

const LANDMARKS = {
  left: { shoulder: 11, hip: 23, knee: 25, ankle: 27 },
  right: { shoulder: 12, hip: 24, knee: 26, ankle: 28 },
} as const;

export const DEFAULT_SQUAT_CONFIG: SquatEngineConfig = {
  minVisibility: 0.6,
  stableFramesRequired: 3,
  standingEnterAngle: 155,
  standingExitAngle: 145,
  bottomEnterAngle: 120,
  bottomExitAngle: 130,
  maxFrameGapMs: 750,
  smoothingAlpha: 0.35,
};

const INITIAL_QUALITY: CaptureQuality = {
  valid: false,
  score: 0,
  issue: 'missing-landmarks',
};

export function createInitialSquatState(): SquatAnalysisState {
  return {
    phase: 'finding-subject',
    repetitions: 0,
    stableFrames: 0,
    totalFrames: 0,
    validFrames: 0,
    quality: INITIAL_QUALITY,
  };
}

function visibility(landmark: PoseLandmark | undefined): number {
  return landmark?.visibility ?? 1;
}

function sideQuality(landmarks: PoseLandmark[], side: BodySide): number {
  const indices = LANDMARKS[side];
  const required = [indices.shoulder, indices.hip, indices.knee, indices.ankle];
  if (required.some((index) => !landmarks[index])) return 0;
  return Math.min(...required.map((index) => visibility(landmarks[index])));
}

function chooseSide(
  landmarks: PoseLandmark[],
  minVisibility: number,
): CaptureQuality {
  if (landmarks.length < 33) {
    return { valid: false, score: 0, issue: 'missing-landmarks' };
  }

  const left = sideQuality(landmarks, 'left');
  const right = sideQuality(landmarks, 'right');
  const side: BodySide = right > left ? 'right' : 'left';
  const score = Math.max(left, right);

  if (score < minVisibility) {
    return { valid: false, score, side, issue: 'low-visibility' };
  }

  return { valid: true, score, side };
}

function calculateTrunkLean(shoulder: PoseLandmark, hip: PoseLandmark): number {
  const horizontal = Math.abs(shoulder.x - hip.x);
  const vertical = Math.abs(shoulder.y - hip.y);
  return (Math.atan2(horizontal, vertical) * 180) / Math.PI;
}

function metricsForSide(landmarks: PoseLandmark[], side: BodySide): SquatMetrics {
  const indices = LANDMARKS[side];
  const shoulder = landmarks[indices.shoulder];
  const hip = landmarks[indices.hip];
  const knee = landmarks[indices.knee];
  const ankle = landmarks[indices.ankle];
  const oppositeSide: BodySide = side === 'left' ? 'right' : 'left';
  const opposite = LANDMARKS[oppositeSide];

  const kneeAngle = calculateAngle(hip, knee, ankle);
  const oppositeQuality = sideQuality(landmarks, oppositeSide);
  const oppositeKneeAngle = calculateAngle(
    landmarks[opposite.hip],
    landmarks[opposite.knee],
    landmarks[opposite.ankle],
  );

  return {
    kneeAngle,
    trunkLean: calculateTrunkLean(shoulder, hip),
    kneeAsymmetry:
      oppositeQuality > 0 ? Math.abs(kneeAngle - oppositeKneeAngle) : undefined,
  };
}

function smooth(previous: number | undefined, current: number, alpha: number): number {
  return previous === undefined ? current : alpha * current + (1 - alpha) * previous;
}

export function analyzeSquatFrame(
  previous: SquatAnalysisState,
  frame: PoseFrame,
  config: SquatEngineConfig = DEFAULT_SQUAT_CONFIG,
): SquatAnalysisState {
  const totalFrames = previous.totalFrames + 1;
  const streamInterrupted =
    previous.lastTimestampMs !== undefined &&
    frame.timestampMs - previous.lastTimestampMs > config.maxFrameGapMs;

  if (streamInterrupted) {
    return {
      ...previous,
      phase: 'finding-subject',
      stableFrames: 0,
      totalFrames,
      lastTimestampMs: frame.timestampMs,
      smoothedKneeAngle: undefined,
      quality: { valid: false, score: 0, issue: 'stream-interrupted' },
    };
  }

  const quality = chooseSide(frame.landmarks, config.minVisibility);
  if (!quality.valid || !quality.side) {
    return {
      ...previous,
      phase: 'finding-subject',
      stableFrames: 0,
      totalFrames,
      lastTimestampMs: frame.timestampMs,
      smoothedKneeAngle: undefined,
      quality,
    };
  }

  const rawMetrics = metricsForSide(frame.landmarks, quality.side);
  const kneeAngle = smooth(
    previous.smoothedKneeAngle,
    rawMetrics.kneeAngle,
    config.smoothingAlpha,
  );
  const metrics = { ...rawMetrics, kneeAngle };
  let phase = previous.phase;
  let stableFrames = previous.stableFrames;
  let repetitions = previous.repetitions;

  switch (phase) {
    case 'finding-subject':
      stableFrames = kneeAngle >= config.standingEnterAngle ? stableFrames + 1 : 0;
      if (stableFrames >= config.stableFramesRequired) {
        phase = 'standing';
        stableFrames = 0;
      }
      break;
    case 'standing':
      if (kneeAngle < config.standingExitAngle) {
        phase = 'descending';
        stableFrames = 0;
      }
      break;
    case 'descending':
      if (kneeAngle <= config.bottomEnterAngle) {
        stableFrames += 1;
        if (stableFrames >= config.stableFramesRequired) {
          phase = 'bottom';
          stableFrames = 0;
        }
      } else if (kneeAngle >= config.standingEnterAngle) {
        phase = 'standing';
        stableFrames = 0;
      } else {
        stableFrames = 0;
      }
      break;
    case 'bottom':
      if (kneeAngle > config.bottomExitAngle) {
        phase = 'ascending';
        stableFrames = 0;
      }
      break;
    case 'ascending':
      if (kneeAngle >= config.standingEnterAngle) {
        stableFrames += 1;
        if (stableFrames >= config.stableFramesRequired) {
          phase = 'standing';
          repetitions += 1;
          stableFrames = 0;
        }
      } else if (kneeAngle <= config.bottomEnterAngle) {
        phase = 'bottom';
        stableFrames = 0;
      } else {
        stableFrames = 0;
      }
      break;
  }

  return {
    ...previous,
    phase,
    repetitions,
    stableFrames,
    totalFrames,
    validFrames: previous.validFrames + 1,
    lastTimestampMs: frame.timestampMs,
    smoothedKneeAngle: kneeAngle,
    metrics,
    quality,
  };
}

export function squatGuidance(state: SquatAnalysisState): string {
  if (!state.quality.valid) {
    if (state.quality.issue === 'stream-interrupted') return '画面中断，请重新站稳';
    if (state.quality.issue === 'low-visibility') return '请后退一步，确保肩、髋、膝、踝完整入镜';
    return '正在寻找身体关键点';
  }

  if (state.analysisWarnings?.includes('knee_valgus')) return '双膝向外打开，保持膝盖对准脚尖';
  if (state.analysisWarnings?.includes('lateral_weight_shift')) return '保持身体居中，避免重心偏向一侧';
  if (state.analysisWarnings?.includes('knee_angle_asymmetry')) return '左右腿同步发力，保持下降对称';

  switch (state.phase) {
    case 'finding-subject':
      return '请自然站立，完成起始校准';
    case 'standing':
      return state.repetitions === 0 ? '准备完成，可以开始下蹲' : '动作完成，准备下一次';
    case 'descending':
      return '保持稳定，继续缓慢下蹲';
    case 'bottom':
      return '已到达动作底部，开始站起';
    case 'ascending':
      return '稳定站起，伸直髋膝';
  }
}
