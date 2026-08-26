import { createInitialSquatState, squatGuidance } from '../engine';
import { parsePythonAnalysisMessage } from '../frame';
import { analyzePythonResult } from '../remoteEngine';
import type { PythonSquatAnalysis } from '../types';

function pythonResult(angle: number, sequence: number, valid = true): PythonSquatAnalysis {
  return {
    type: 'squat-analysis-v1', sequence, timestampMs: sequence * 33,
    quality: { valid, score: valid ? 0.95 : 0.2, issue: valid ? undefined : 'low-visibility' },
    metrics: valid ? {
      leftKneeAngle: angle, rightKneeAngle: angle, averageKneeAngle: angle,
      kneeAngleAsymmetry: 0, kneeDistanceRatio: 0.9,
      leftValgusPercent: 2, rightValgusPercent: 2, pelvisTiltDeg: 1,
      shoulderTiltDeg: 1, trunkLateralLeanDeg: 2, centerShiftPercent: 3,
    } : null,
    analysis: { motion: 'holding', depthProgress: 0.5, symmetryScore: 100, warnings: [] },
  };
}

function runAngles(angles: number[]) {
  return angles.reduce(
    (state, angle, sequence) => analyzePythonResult(state, pythonResult(angle, sequence)),
    createInitialSquatState(),
  );
}

describe('frontend squat counter', () => {
  it('counts a complete standing-bottom-standing cycle', () => {
    const result = runAngles([170, 170, 170, 140, 125, 115, 115, 115, 135, 150, 165, 165, 165]);
    expect(result.repetitions).toBe(1);
    expect(result.phase).toBe('standing');
  });

  it('rejects a partial squat', () => {
    expect(runAngles([170, 170, 170, 140, 130, 140, 165, 165, 165]).repetitions).toBe(0);
  });

  it('resets calibration on invalid Python analysis', () => {
    const result = analyzePythonResult(runAngles([170, 170, 170]), pythonResult(170, 4, false));
    expect(result.phase).toBe('finding-subject');
    expect(result.quality.issue).toBe('low-visibility');
  });

  it('keeps Python metrics and warnings for presentation', () => {
    const input = pythonResult(130, 1);
    input.analysis.warnings = ['knee_valgus'];
    const state = analyzePythonResult(createInitialSquatState(), input);
    expect(state.metrics?.kneeDistanceRatio).toBe(0.9);
    expect(squatGuidance(state)).toContain('双膝向外');
  });
});

describe('Python response parser', () => {
  it('accepts the versioned response contract', () => {
    expect(parsePythonAnalysisMessage(JSON.stringify(pythonResult(160, 1)))?.metrics?.averageKneeAngle).toBe(160);
  });

  it('rejects malformed and raw landmark messages', () => {
    expect(parsePythonAnalysisMessage('not-json')).toBeNull();
    expect(parsePythonAnalysisMessage(JSON.stringify({ version: 1, landmarks: [] }))).toBeNull();
  });
});
