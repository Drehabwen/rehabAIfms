import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { PoseCapture } from '../features/squat/PoseCapture';
import type { SquatPhase } from '../features/squat/types';
import { useSquatSession } from '../features/squat/useSquatSession';
import { SquatLiveMetrics } from './SquatLiveMetrics';

const PHASE_LABELS: Record<SquatPhase, string> = {
  'finding-subject': '校准中', standing: '站立', descending: '下蹲', bottom: '底部', ascending: '站起',
};

export default function SquatAnalyzer() {
  const { analysis, handleMessage, isAnalyzing, messageErrors, reset, toggle, validFrameRate } = useSquatSession();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>REHABAIFMS · SQUAT V2</Text><Text style={styles.title}>深蹲训练</Text></View>
        <View style={[styles.statusPill, analysis.quality.valid && styles.statusPillReady]}>
          <View style={[styles.statusDot, analysis.quality.valid && styles.statusDotReady]} />
          <Text style={styles.statusText}>{PHASE_LABELS[analysis.phase]}</Text>
        </View>
      </View>

      <View style={styles.cameraCard}>
        <PoseCapture onFrameMessage={handleMessage} paused={!isAnalyzing} />
        <View pointerEvents="none" style={styles.frameGuide}>
          <View style={styles.frameTopLeft} /><View style={styles.frameTopRight} />
          <View style={styles.frameBottomLeft} /><View style={styles.frameBottomRight} />
        </View>
      </View>

      <SquatLiveMetrics analysis={analysis} validFrameRate={validFrameRate} />

      {(messageErrors > 0 || !analysis.quality.valid) && <Text style={styles.qualityNote}>{messageErrors > 0 ? `已忽略 ${messageErrors} 个格式错误的姿态帧` : '只有采集质量足够时才会计算动作次数'}</Text>}
      <View style={styles.controls}>
        <TouchableOpacity accessibilityRole="button" style={[styles.button, styles.secondaryButton]} onPress={reset}><Text style={styles.secondaryButtonText}>重新开始</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={[styles.button, styles.primaryButton]} onPress={toggle}><Text style={styles.primaryButtonText}>{isAnalyzing ? '暂停分析' : '继续分析'}</Text></TouchableOpacity>
      </View>
      <Text style={styles.disclaimer}>实验性训练反馈，不构成医学诊断或治疗建议</Text>
    </SafeAreaView>
  );
}

const corner = { borderColor: '#DDF6E8', height: 34, position: 'absolute' as const, width: 34 };
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F5F2', paddingHorizontal: 18, paddingTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  eyebrow: { color: '#5B746A', fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  title: { color: '#14241E', fontSize: 28, fontWeight: '800', marginTop: 2 },
  statusPill: { alignItems: 'center', backgroundColor: '#E6EAE7', borderRadius: 18, flexDirection: 'row', gap: 7, paddingHorizontal: 12, paddingVertical: 8 },
  statusPillReady: { backgroundColor: '#DDEFE6' },
  statusDot: { backgroundColor: '#89968F', borderRadius: 4, height: 8, width: 8 },
  statusDotReady: { backgroundColor: '#19734C' },
  statusText: { color: '#31443C', fontSize: 12, fontWeight: '700' },
  cameraCard: { backgroundColor: '#17201C', borderRadius: 22, flex: 1, minHeight: 310, overflow: 'hidden' },
  frameGuide: { bottom: 28, left: 28, position: 'absolute', right: 28, top: 28 },
  frameTopLeft: { ...corner, borderLeftWidth: 2, borderTopLeftRadius: 14, borderTopWidth: 2, left: 0, top: 0 },
  frameTopRight: { ...corner, borderRightWidth: 2, borderTopRightRadius: 14, borderTopWidth: 2, right: 0, top: 0 },
  frameBottomLeft: { ...corner, borderBottomLeftRadius: 14, borderBottomWidth: 2, borderLeftWidth: 2, bottom: 0, left: 0 },
  frameBottomRight: { ...corner, borderBottomRightRadius: 14, borderBottomWidth: 2, borderRightWidth: 2, bottom: 0, right: 0 },
  qualityNote: { color: '#68766F', fontSize: 10, marginTop: 8, textAlign: 'center' },
  controls: { flexDirection: 'row', gap: 10, marginTop: 12 },
  button: { alignItems: 'center', borderRadius: 14, flex: 1, paddingVertical: 14 },
  primaryButton: { backgroundColor: '#176A48' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  secondaryButton: { backgroundColor: '#E2E8E4' },
  secondaryButtonText: { color: '#33463D', fontSize: 14, fontWeight: '800' },
  disclaimer: { color: '#7C8882', fontSize: 9, paddingBottom: 8, paddingTop: 10, textAlign: 'center' },
});
