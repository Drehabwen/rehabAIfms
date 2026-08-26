import type { FrontendSquatUpdate, PythonSquatAnalysis, SquatAnalysisState } from './types';

export function applyFrontendCounter(previous: SquatAnalysisState, update: FrontendSquatUpdate): SquatAnalysisState {
  return {
    ...previous,
    phase: update.phase,
    repetitions: update.repetitions,
    totalFrames: update.totalFrames,
    validFrames: update.validFrames,
    smoothedKneeAngle: update.kneeAngle,
    metrics: { ...previous.metrics, kneeAngle: update.kneeAngle, trunkLean: previous.metrics?.trunkLean ?? 0 },
    quality: { valid: true, score: 1 },
  };
}

export function applyPythonInsights(previous: SquatAnalysisState, result: PythonSquatAnalysis): SquatAnalysisState {
  if (!result.quality.valid || !result.metrics) {
    return { ...previous, quality: { valid: false, score: result.quality.score, issue: 'low-visibility' } };
  }
  return {
    ...previous,
    metrics: {
      kneeAngle: previous.metrics?.kneeAngle ?? result.metrics.averageKneeAngle,
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
    quality: { valid: true, score: result.quality.score },
  };
}
