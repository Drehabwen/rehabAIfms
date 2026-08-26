import { useCallback, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { analyzeSquatFrame, createInitialSquatState, squatGuidance } from '../features/squat/engine';
import { parsePoseFrameMessage } from '../features/squat/frame';
import { PoseCapture } from '../features/squat/PoseCapture';
import type { SquatAnalysisState, SquatPhase } from '../features/squat/types';

const PHASE_LABELS: Record<SquatPhase, string> = {
  'finding-subject': '校准中', standing: '站立', descending: '下蹲', bottom: '底部', ascending: '站起',
};

function Metric({ label, value, suffix = '' }: { label: string; value: string; suffix?: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}{suffix}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

export default function SquatAnalyzer() {
  const [analysis, setAnalysis] = useState<SquatAnalysisState>(createInitialSquatState);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [messageErrors, setMessageErrors] = useState(0);

  const handleMessage = useCallback((rawMessage: string) => {
    if (!isAnalyzing) return;
    const frame = parsePoseFrameMessage(rawMessage);
    if (!frame) {
      setMessageErrors((count) => count + 1);
      return;
    }
    setAnalysis((state) => analyzeSquatFrame(state, frame));
  }, [isAnalyzing]);

  const reset = useCallback(() => {
    setAnalysis(createInitialSquatState());
    setMessageErrors(0);
    setIsAnalyzing(true);
  }, []);

  const validFrameRate = useMemo(() => analysis.totalFrames === 0
    ? 0
    : Math.round((analysis.validFrames / analysis.totalFrames) * 100), [analysis]);
  const guidance = isAnalyzing ? squatGuidance(analysis) : '分析已暂停';
  const kneeAngle = analysis.metrics ? Math.round(analysis.metrics.kneeAngle).toString() : '--';
  const trunkLean = analysis.metrics ? Math.round(analysis.metrics.trunkLean).toString() : '--';

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
        <View style={styles.guidanceOverlay}><Text style={styles.guidanceText}>{guidance}</Text></View>
      </View>

      <View style={styles.repCard}>
        <View><Text style={styles.repLabel}>已完成</Text><Text style={styles.repValue}>{analysis.repetitions}</Text><Text style={styles.repUnit}>次完整深蹲</Text></View>
        <View style={styles.metricsRow}>
          <Metric label="膝角" value={kneeAngle} suffix="°" />
          <Metric label="躯干倾斜" value={trunkLean} suffix="°" />
          <Metric label="有效帧" value={validFrameRate.toString()} suffix="%" />
        </View>
      </View>

      {(messageErrors > 0 || !analysis.quality.valid) && <Text style={styles.qualityNote}>{messageErrors > 0 ? `已忽略 ${messageErrors} 个格式错误的姿态帧` : '只有采集质量足够时才会计算动作次数'}</Text>}
      <View style={styles.controls}>
        <TouchableOpacity accessibilityRole="button" style={[styles.button, styles.secondaryButton]} onPress={reset}><Text style={styles.secondaryButtonText}>重新开始</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={[styles.button, styles.primaryButton]} onPress={() => setIsAnalyzing((value) => !value)}><Text style={styles.primaryButtonText}>{isAnalyzing ? '暂停分析' : '继续分析'}</Text></TouchableOpacity>
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
  guidanceOverlay: { alignItems: 'center', bottom: 18, left: 14, position: 'absolute', right: 14 },
  guidanceText: { backgroundColor: 'rgba(12, 24, 19, .82)', borderRadius: 12, color: '#FFFFFF', fontSize: 14, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 10, textAlign: 'center' },
  repCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 18, paddingVertical: 15 },
  repLabel: { color: '#738078', fontSize: 11, fontWeight: '600' },
  repValue: { color: '#173C2D', fontSize: 38, fontWeight: '900', lineHeight: 42 },
  repUnit: { color: '#516159', fontSize: 11 },
  metricsRow: { flexDirection: 'row', gap: 8 },
  metric: { alignItems: 'center', backgroundColor: '#F3F7F4', borderRadius: 12, minWidth: 68, paddingHorizontal: 8, paddingVertical: 9 },
  metricValue: { color: '#1C4937', fontSize: 16, fontWeight: '800' },
  metricLabel: { color: '#76837C', fontSize: 9, marginTop: 2 },
  qualityNote: { color: '#68766F', fontSize: 10, marginTop: 8, textAlign: 'center' },
  controls: { flexDirection: 'row', gap: 10, marginTop: 12 },
  button: { alignItems: 'center', borderRadius: 14, flex: 1, paddingVertical: 14 },
  primaryButton: { backgroundColor: '#176A48' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  secondaryButton: { backgroundColor: '#E2E8E4' },
  secondaryButtonText: { color: '#33463D', fontSize: 14, fontWeight: '800' },
  disclaimer: { color: '#7C8882', fontSize: 9, paddingBottom: 8, paddingTop: 10, textAlign: 'center' },
});
