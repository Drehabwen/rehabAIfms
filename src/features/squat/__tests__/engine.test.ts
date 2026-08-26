import { analyzeSquatFrame, createInitialSquatState } from '../engine';
import { parsePoseFrameMessage } from '../frame';
import type { PoseFrame, PoseLandmark, SquatAnalysisState } from '../types';

function landmarksForAngle(angleDegrees: number, visibility = 0.95): PoseLandmark[] {
  const landmarks = Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    visibility,
  }));
  const radians = (angleDegrees * Math.PI) / 180;

  for (const indices of [
    { shoulder: 11, hip: 23, knee: 25, ankle: 27 },
    { shoulder: 12, hip: 24, knee: 26, ankle: 28 },
  ]) {
    landmarks[indices.knee] = { x: 0, y: 0, z: 0, visibility };
    landmarks[indices.hip] = { x: 1, y: 0, z: 0, visibility };
    landmarks[indices.ankle] = {
      x: Math.cos(radians),
      y: Math.sin(radians),
      z: 0,
      visibility,
    };
    landmarks[indices.shoulder] = { x: 1, y: -1, z: 0, visibility };
  }

  return landmarks;
}

function runAngles(
  angles: number[],
  initial = createInitialSquatState(),
): SquatAnalysisState {
  return angles.reduce(
    (state, angle, index) =>
      analyzeSquatFrame(state, {
        version: 1,
        sequence: index,
        timestampMs: index * 33,
        landmarks: landmarksForAngle(angle),
      }),
    initial,
  );
}

describe('squat engine', () => {
  it('counts one complete standing-bottom-standing cycle', () => {
    const result = runAngles([
      170, 170, 170,
      145, 130, 110, 90, 90, 90, 90, 90,
      120, 135, 150, 170, 170, 170, 170, 170, 170, 170, 170,
    ]);

    expect(result.phase).toBe('standing');
    expect(result.repetitions).toBe(1);
  });

  it('does not count a partial squat that never reaches the bottom', () => {
    const result = runAngles([
      170, 170, 170,
      145, 135, 125, 130, 145, 165, 165, 165,
    ]);

    expect(result.repetitions).toBe(0);
  });

  it('does not count threshold jitter as a repetition', () => {
    const result = runAngles([
      170, 170, 170,
      148, 142, 149, 143, 150, 165, 160,
    ]);

    expect(result.repetitions).toBe(0);
  });

  it('rejects frames with low landmark visibility', () => {
    const frame: PoseFrame = {
      version: 1,
      sequence: 1,
      timestampMs: 33,
      landmarks: landmarksForAngle(170, 0.2),
    };
    const result = analyzeSquatFrame(createInitialSquatState(), frame);

    expect(result.quality.valid).toBe(false);
    expect(result.quality.issue).toBe('low-visibility');
    expect(result.validFrames).toBe(0);
  });

  it('resets calibration after a long frame gap', () => {
    const calibrated = runAngles([170, 170, 170]);
    const result = analyzeSquatFrame(calibrated, {
      version: 1,
      sequence: 4,
      timestampMs: 2000,
      landmarks: landmarksForAngle(170),
    });

    expect(result.phase).toBe('finding-subject');
    expect(result.quality.issue).toBe('stream-interrupted');
  });
});

describe('pose frame parser', () => {
  it('accepts a versioned frame contract', () => {
    const raw = JSON.stringify({
      version: 1,
      sequence: 2,
      timestampMs: 100,
      landmarks: landmarksForAngle(160),
    });

    expect(parsePoseFrameMessage(raw)?.sequence).toBe(2);
  });

  it('rejects malformed and legacy messages', () => {
    expect(parsePoseFrameMessage('not-json')).toBeNull();
    expect(parsePoseFrameMessage(JSON.stringify(landmarksForAngle(160)))).toBeNull();
  });
});
