import { useCallback, useMemo, useState } from 'react';

import { createInitialSquatState } from './engine';
import { parseFrontendSquatMessage, parsePythonAnalysisMessage } from './frame';
import { applyFrontendCounter, applyPythonInsights } from './remoteEngine';
import type { SquatAnalysisState } from './types';

export function useSquatSession() {
  const [analysis, setAnalysis] = useState<SquatAnalysisState>(createInitialSquatState);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [messageErrors, setMessageErrors] = useState(0);

  const handleMessage = useCallback((rawMessage: string) => {
    if (!isAnalyzing) return;
    const counter = parseFrontendSquatMessage(rawMessage);
    if (counter) {
      setAnalysis((state) => applyFrontendCounter(state, counter));
      return;
    }
    const insights = parsePythonAnalysisMessage(rawMessage);
    if (!insights) {
      setMessageErrors((count) => count + 1);
      return;
    }
    setAnalysis((state) => applyPythonInsights(state, insights));
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
    handleMessage,
    isAnalyzing,
    messageErrors,
    reset,
    toggle: () => setIsAnalyzing((value) => !value),
    validFrameRate,
  };
}
