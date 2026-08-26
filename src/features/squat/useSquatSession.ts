import { useCallback, useMemo, useState } from 'react';

import { createInitialSquatState, squatGuidance } from './engine';
import { parsePythonAnalysisMessage } from './frame';
import { analyzePythonResult } from './remoteEngine';
import type { SquatAnalysisState } from './types';

export function useSquatSession() {
  const [analysis, setAnalysis] = useState<SquatAnalysisState>(createInitialSquatState);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [messageErrors, setMessageErrors] = useState(0);

  const handleMessage = useCallback((rawMessage: string) => {
    if (!isAnalyzing) return;
    const result = parsePythonAnalysisMessage(rawMessage);
    if (!result) {
      setMessageErrors((count) => count + 1);
      return;
    }
    setAnalysis((state) => analyzePythonResult(state, result));
  }, [isAnalyzing]);

  const reset = useCallback(() => {
    setAnalysis(createInitialSquatState());
    setMessageErrors(0);
    setIsAnalyzing(true);
  }, []);

  const validFrameRate = useMemo(() => analysis.totalFrames === 0
    ? 0 : Math.round((analysis.validFrames / analysis.totalFrames) * 100), [analysis]);

  return {
    analysis,
    guidance: isAnalyzing ? squatGuidance(analysis) : '分析已暂停',
    handleMessage,
    isAnalyzing,
    messageErrors,
    reset,
    toggle: () => setIsAnalyzing((value) => !value),
    validFrameRate,
  };
}
