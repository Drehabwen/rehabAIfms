import type { PythonSquatAnalysis } from './types';

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
