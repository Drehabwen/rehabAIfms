import { createInitialSquatState, squatGuidance } from '../engine';
import { parseFrontendSquatMessage, parsePythonAnalysisMessage } from '../frame';
import { applyFrontendCounter, applyPythonInsights } from '../remoteEngine';
import type { FrontendSquatUpdate, PythonSquatAnalysis } from '../types';

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

function frontendUpdate(repetitions: number, phase: FrontendSquatUpdate['phase'] = 'standing'): FrontendSquatUpdate {
  return { type: 'frontend-squat-state-v1', phase, repetitions, kneeAngle: 165, totalFrames: 30, validFrames: 29 };
}

describe('frontend squat counter', () => {
  it('accepts the browser counter independently of Python', () => {
    const result = applyFrontendCounter(createInitialSquatState(), frontendUpdate(2));
    expect(result.repetitions).toBe(2);
    expect(result.validFrames).toBe(29);
  });

  it('keeps Python metrics and warnings for presentation', () => {
    const input = pythonResult(130, 1);
    input.analysis.warnings = ['knee_valgus'];
    const state = applyPythonInsights(createInitialSquatState(), input);
    expect(state.metrics?.kneeDistanceRatio).toBe(0.9);
    expect(squatGuidance(state)).toContain('双膝向外');
  });
});

describe('Python response parser', () => {
  it('accepts the versioned response contract', () => {
    expect(parsePythonAnalysisMessage(JSON.stringify(pythonResult(160, 1)))?.metrics?.averageKneeAngle).toBe(160);
  });

  it('parses the independent frontend counter signal', () => {
    expect(parseFrontendSquatMessage(JSON.stringify(frontendUpdate(3)))?.repetitions).toBe(3);
  });

  it('rejects malformed and raw landmark messages', () => {
    expect(parsePythonAnalysisMessage('not-json')).toBeNull();
    expect(parsePythonAnalysisMessage(JSON.stringify({ version: 1, landmarks: [] }))).toBeNull();
  });
});
