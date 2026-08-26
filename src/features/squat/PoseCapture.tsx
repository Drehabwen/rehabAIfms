import { useEffect, useRef } from 'react';

type PoseCaptureProps = {
  onFrameMessage: (message: string) => void;
  paused: boolean;
};

// Metro replaces this file with PoseCapture.native.tsx for Android and iOS.
export function PoseCapture({ onFrameMessage, paused }: PoseCaptureProps) {
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

  return (
    <iframe
      ref={frameRef}
      src="/pose.html"
      allow="camera"
      title="深蹲姿态采集"
      style={{ background: '#17201C', border: 0, height: '100%', width: '100%' }}
    />
  );
}
