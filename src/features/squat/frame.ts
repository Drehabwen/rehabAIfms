import type { PoseFrame, PoseLandmark, PythonSquatAnalysis } from './types';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function parsePythonAnalysisMessage(raw: string): PythonSquatAnalysis | null {
  try {
    const value = JSON.parse(raw) as PythonSquatAnalysis;
    if (
      value?.type !== 'squat-analysis-v1'
      || !Number.isInteger(value.sequence)
      || !isFiniteNumber(value.timestampMs)
      || typeof value.quality?.valid !== 'boolean'
      || !isFiniteNumber(value.quality?.score)
      || !value.analysis
      || !Array.isArray(value.analysis.warnings)
    ) return null;
    if (value.metrics && !isFiniteNumber(value.metrics.averageKneeAngle)) return null;
    return value;
  } catch {
    return null;
  }
}

function isLandmark(value: unknown): value is PoseLandmark {
  if (!value || typeof value !== 'object') return false;

  const landmark = value as Record<string, unknown>;
  return (
    isFiniteNumber(landmark.x) &&
    isFiniteNumber(landmark.y) &&
    isFiniteNumber(landmark.z) &&
    (landmark.visibility === undefined || isFiniteNumber(landmark.visibility))
  );
}

export function parsePoseFrameMessage(raw: string): PoseFrame | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;

    const frame = value as Record<string, unknown>;
    if (
      frame.version !== 1 ||
      !Number.isInteger(frame.sequence) ||
      !isFiniteNumber(frame.timestampMs) ||
      !Array.isArray(frame.landmarks) ||
      frame.landmarks.length < 33 ||
      !frame.landmarks.every(isLandmark)
    ) {
      return null;
    }

    return frame as unknown as PoseFrame;
  } catch {
    return null;
  }
}
