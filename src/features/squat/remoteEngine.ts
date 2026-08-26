import { DEFAULT_SQUAT_CONFIG } from './engine';
import type { CaptureQuality, PythonSquatAnalysis, SquatAnalysisState, SquatPhase } from './types';

export function analyzePythonResult(
  previous: SquatAnalysisState,
  result: PythonSquatAnalysis,
): SquatAnalysisState {
  const totalFrames = previous.totalFrames + 1;
  const quality: CaptureQuality = result.quality.valid
    ? { valid: true, score: result.quality.score }
    : { valid: false, score: result.quality.score, issue: 'low-visibility' };

  if (!result.quality.valid || !result.metrics) {
    return { ...previous, phase: 'finding-subject', stableFrames: 0, totalFrames, quality };
  }

  const kneeAngle = result.metrics.averageKneeAngle;
  let phase: SquatPhase = previous.phase;
  let stableFrames = previous.stableFrames;
  let repetitions = previous.repetitions;
  const config = DEFAULT_SQUAT_CONFIG;

  if (phase === 'finding-subject') {
    stableFrames = kneeAngle >= config.standingEnterAngle ? stableFrames + 1 : 0;
    if (stableFrames >= config.stableFramesRequired) [phase, stableFrames] = ['standing', 0];
  } else if (phase === 'standing' && kneeAngle < config.standingExitAngle) {
    [phase, stableFrames] = ['descending', 0];
  } else if (phase === 'descending') {
    if (kneeAngle <= config.bottomEnterAngle) {
      stableFrames += 1;
      if (stableFrames >= config.stableFramesRequired) [phase, stableFrames] = ['bottom', 0];
    } else if (kneeAngle >= config.standingEnterAngle) [phase, stableFrames] = ['standing', 0];
    else stableFrames = 0;
  } else if (phase === 'bottom' && kneeAngle > config.bottomExitAngle) {
    [phase, stableFrames] = ['ascending', 0];
  } else if (phase === 'ascending') {
    if (kneeAngle >= config.standingEnterAngle) {
      stableFrames += 1;
      if (stableFrames >= config.stableFramesRequired) {
        phase = 'standing'; stableFrames = 0; repetitions += 1;
      }
    } else if (kneeAngle <= config.bottomEnterAngle) [phase, stableFrames] = ['bottom', 0];
    else stableFrames = 0;
  }

  return {
    ...previous,
    phase,
    repetitions,
    stableFrames,
    totalFrames,
    validFrames: previous.validFrames + 1,
    lastTimestampMs: result.timestampMs,
    smoothedKneeAngle: kneeAngle,
    metrics: {
      kneeAngle,
      trunkLean: Math.abs(result.metrics.trunkLateralLeanDeg),
      kneeAsymmetry: result.metrics.kneeAngleAsymmetry,
      kneeDistanceRatio: result.metrics.kneeDistanceRatio,
      leftValgusPercent: result.metrics.leftValgusPercent,
      rightValgusPercent: result.metrics.rightValgusPercent,
      pelvisTiltDeg: result.metrics.pelvisTiltDeg,
      shoulderTiltDeg: result.metrics.shoulderTiltDeg,
      centerShiftPercent: result.metrics.centerShiftPercent,
    },
    analysisWarnings: result.analysis.warnings,
    quality,
  };
}
