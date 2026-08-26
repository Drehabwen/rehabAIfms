import type { PoseFrame, PoseLandmark } from './types';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
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
