import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

type PoseCaptureProps = {
  onFrameMessage: (message: string) => void;
  paused: boolean;
};

const POSE_HTML = require('../../../assets/pose.html');

export function PoseCapture({ onFrameMessage, paused }: PoseCaptureProps) {
  return (
    <WebView
      source={POSE_HTML}
      style={styles.capture}
      onMessage={(event) => {
        if (!paused) onFrameMessage(event.nativeEvent.data);
      }}
      javaScriptEnabled
      domStorageEnabled
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
    />
  );
}

const styles = StyleSheet.create({
  capture: { backgroundColor: '#17201C', flex: 1 },
});
