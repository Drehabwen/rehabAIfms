import type { FrontendSquatUpdate, PythonSquatAnalysis } from './types';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function parseFrontendSquatMessage(raw: string): FrontendSquatUpdate | null {
  try {
    const value = JSON.parse(raw) as FrontendSquatUpdate;
    if (value?.type !== 'frontend-squat-state-v1') return null;
    if (!isFiniteNumber(value.kneeAngle) || !Number.isInteger(value.repetitions)) return null;
    if (!Number.isInteger(value.totalFrames) || !Number.isInteger(value.validFrames)) return null;
    if (!['finding-subject', 'standing', 'descending', 'bottom', 'ascending'].includes(value.phase)) return null;
    return value;
  } catch {
    return null;
  }
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
