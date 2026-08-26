import { useEffect, useRef } from 'react';

import type { SquatAnalysisState } from './types';

type PoseCaptureProps = {
  onFrameMessage: (message: string) => void;
  paused: boolean;
  analysis: SquatAnalysisState;
};

// Metro replaces this file with PoseCapture.native.tsx for Android and iOS.
export function PoseCapture({ onFrameMessage, paused, analysis }: PoseCaptureProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const receiveFrame = (event: MessageEvent) => {
      if (
        paused
        || event.source !== frameRef.current?.contentWindow
        || event.origin !== window.location.origin
        || typeof event.data !== 'string'
      ) return;

      onFrameMessage(event.data);
    };

    window.addEventListener('message', receiveFrame);
    return () => window.removeEventListener('message', receiveFrame);
  }, [onFrameMessage, paused]);

  useEffect(() => {
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({
      type: 'squat-analysis',
      phase: analysis.phase,
      repetitions: analysis.repetitions,
      kneeAngle: analysis.metrics?.kneeAngle,
      validFrames: analysis.validFrames,
      totalFrames: analysis.totalFrames,
      qualityValid: analysis.quality.valid,
      qualityIssue: analysis.quality.issue,
    }), window.location.origin);
  }, [analysis]);

  return (
    <iframe
      ref={frameRef}
      src="/pose.html"
      allow="camera; fullscreen"
      allowFullScreen
      title="深蹲姿态采集"
      style={{ background: '#17201C', border: 0, height: '100%', width: '100%' }}
    />
  );
}
