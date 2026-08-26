import type { CaptureQuality, SquatAnalysisState, SquatEngineConfig } from './types';

export const DEFAULT_SQUAT_CONFIG: SquatEngineConfig = {
  minVisibility: 0.6,
  stableFramesRequired: 3,
  standingEnterAngle: 155,
  standingExitAngle: 145,
  bottomEnterAngle: 120,
  bottomExitAngle: 130,
  maxFrameGapMs: 750,
  smoothingAlpha: 0.35,
};

const INITIAL_QUALITY: CaptureQuality = { valid: false, score: 0, issue: 'missing-landmarks' };

export function createInitialSquatState(): SquatAnalysisState {
  return {
    phase: 'finding-subject', repetitions: 0, stableFrames: 0,
    totalFrames: 0, validFrames: 0, quality: INITIAL_QUALITY,
  };
}

export function squatGuidance(state: SquatAnalysisState): string {
  if (!state.quality.valid) {
    if (state.quality.issue === 'stream-interrupted') return '画面中断，请重新站稳';
    if (state.quality.issue === 'low-visibility') return '请后退一步，确保肩、髋、膝、踝完整入镜';
    return '正在寻找身体关键点';
  }
  if (state.analysisWarnings?.includes('knee_valgus')) return '双膝向外打开，保持膝盖对准脚尖';
  if (state.analysisWarnings?.includes('lateral_weight_shift')) return '保持身体居中，避免重心偏向一侧';
  if (state.analysisWarnings?.includes('knee_angle_asymmetry')) return '左右腿同步发力，保持下降对称';

  switch (state.phase) {
    case 'finding-subject': return '请自然站立，完成起始校准';
    case 'standing': return state.repetitions === 0 ? '准备完成，可以开始下蹲' : '动作完成，准备下一次';
    case 'descending': return '保持稳定，继续缓慢下蹲';
    case 'bottom': return '已到达动作底部，开始站起';
    case 'ascending': return '稳定站起，伸直髋膝';
  }
}
