import { StyleSheet, Text, View } from 'react-native';

import type { SquatAnalysisState } from '../features/squat/types';

function Metric({ label, value, suffix = '' }: { label: string; value: string; suffix?: string }) {
  return <View style={styles.metric}><Text style={styles.value}>{value}{suffix}</Text><Text style={styles.label}>{label}</Text></View>;
}

export function SquatLiveMetrics({ analysis, validFrameRate }: { analysis: SquatAnalysisState; validFrameRate: number }) {
  const kneeAngle = analysis.metrics ? Math.round(analysis.metrics.kneeAngle).toString() : '--';
  const centerShift = analysis.metrics ? Math.round(Math.abs(analysis.metrics.centerShiftPercent ?? 0)).toString() : '--';

  return (
    <View style={styles.card}>
      <View><Text style={styles.repLabel}>已完成</Text><Text style={styles.repValue}>{analysis.repetitions}</Text><Text style={styles.repUnit}>次完整深蹲</Text></View>
      <View style={styles.row}>
        <Metric label="膝角" value={kneeAngle} suffix="°" />
        <Metric label="中心偏移" value={centerShift} suffix="%" />
        <Metric label="有效帧" value={validFrameRate.toString()} suffix="%" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 18, paddingVertical: 15 },
  repLabel: { color: '#738078', fontSize: 11, fontWeight: '600' },
  repValue: { color: '#173C2D', fontSize: 38, fontWeight: '900', lineHeight: 42 },
  repUnit: { color: '#516159', fontSize: 11 },
  row: { flexDirection: 'row', gap: 8 },
  metric: { alignItems: 'center', backgroundColor: '#F3F7F4', borderRadius: 12, minWidth: 68, paddingHorizontal: 8, paddingVertical: 9 },
  value: { color: '#1C4937', fontSize: 16, fontWeight: '800' },
  label: { color: '#76837C', fontSize: 9, marginTop: 2 },
});
