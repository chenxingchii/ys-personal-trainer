import type { MetricId } from '../biomechanics/types'

/** 计次方式：次或秒（静态拉伸、原地激活类动作用秒）。 */
export type ExerciseUnit = 'reps' | 'seconds'

/** 单个训练动作：名称、针对指标、组数次数、组间休息与动作要领。 */
export type Exercise = {
  id: string
  name: string
  /** 该动作主要改善的指标；热身与放松动作为空数组。 */
  targets: MetricId[]
  unit: ExerciseUnit
  sets: number
  reps: number
  restSeconds: number
  /** 单组预计耗时（秒，含归位与调整），仅用于估算整节课时长。 */
  setSeconds: number
  cue: string
}

/**
 * 主体动作库：与 jumpRules.ts 的 11 项指标一一对应，
 * 动作名称与要领沿用 reports/diagnosis.ts 中已有的教练口径，保持一致。
 *
 * 参数定位（2026-09-17 已定，依据见《训练方案科学性依据》§4.1）：
 * 本课定位为「基于动作模式的矫正性练习课」，不是爆发力训练课——被试为普通大学生
 * 而非运动员，动作均为低负荷自重动作，目标是纠正技术环节而非最大化功率输出。
 * 据此组间休息取 60–90 秒（矫正/动作学习区间），而非爆发力训练文献建议的 3–7 分钟
 * （Şener 等, 2025, BMC Sports Sci Med Rehabil）。单次课主体触地量约 45–70 次，
 * 属 Davies 等（2015, Int J Sports Phys Ther）界定的低量区间。
 * 论文中描述本课时须写作「矫正性练习课」，不可写作「爆发力训练课」。
 *
 * TODO(教练复核)：组数、次数与组间休息仍为体育教学通行经验值，
 * 待按实际教学对象复核后固化，并同步到论文方法学描述。
 */
export const EXERCISES: readonly Exercise[] = [
  {
    id: 'pause-pre-squat',
    name: '停顿预蹲跳',
    targets: ['pre-squat-knee'],
    unit: 'reps',
    sets: 3,
    reps: 5,
    restSeconds: 90,
    setSeconds: 35,
    cue: '下蹲到位后停住半秒，再从脚底向上连续蹬伸，每次深度保持一致。',
  },
  {
    id: 'ankle-knee-drive',
    name: '原地踝膝蹬伸',
    targets: ['pre-push-shin'],
    unit: 'reps',
    sets: 3,
    reps: 6,
    restSeconds: 90,
    setSeconds: 35,
    cue: '脚掌完整受力，膝盖沿脚尖方向向前送，小腿不要过度后坐。',
  },
  {
    id: 'hip-hinge-squat-jump',
    name: '髋主导半蹲跳',
    targets: ['pre-push-hip'],
    unit: 'reps',
    sets: 3,
    reps: 6,
    restSeconds: 90,
    setSeconds: 35,
    cue: '髋部向后坐但胸口保持控制，先找髋部发力，再追求速度。',
  },
  {
    id: 'continuous-vertical-jump',
    name: '连续纵跳',
    targets: ['takeoff-knee'],
    unit: 'reps',
    sets: 3,
    reps: 6,
    restSeconds: 90,
    setSeconds: 35,
    cue: '每次离地前确认膝、髋伸展同步，落地安静、身体稳定。',
  },
  {
    id: 'arm-backswing',
    name: '摆臂蓄力',
    targets: ['backward-arm'],
    unit: 'reps',
    sets: 3,
    reps: 8,
    restSeconds: 60,
    setSeconds: 30,
    cue: '预蹲时手臂向后摆出并停住，感受为起跳蓄力的张力。',
  },
  {
    id: 'arm-forward-drive',
    name: '快速前摆跳',
    targets: ['forward-arm'],
    unit: 'reps',
    sets: 3,
    reps: 8,
    restSeconds: 60,
    setSeconds: 30,
    cue: '起跳瞬间手臂快速向前上方摆动，和蹬地保持同一拍。',
  },
  {
    id: 'full-arm-swing-jump',
    name: '连续摆臂跳',
    targets: ['arm-swing-range'],
    unit: 'reps',
    sets: 3,
    reps: 8,
    restSeconds: 60,
    setSeconds: 32,
    cue: '后摆放松、前摆果断，让摆臂形成完整连贯的幅度。',
  },
  {
    id: 'landing-freeze',
    name: '落地定格',
    targets: ['landing-contact-knee'],
    unit: 'reps',
    sets: 3,
    reps: 5,
    restSeconds: 75,
    setSeconds: 32,
    cue: '落地后保持 2 秒再起身，膝盖保持有弹性的屈曲，不要锁死。',
  },
  {
    id: 'landing-buffer-squat',
    name: '落地缓冲深蹲',
    targets: ['landing-lowest-knee'],
    unit: 'reps',
    sets: 3,
    reps: 6,
    restSeconds: 75,
    setSeconds: 34,
    cue: '脚掌落地后膝盖顺势弯曲吸收冲击，胸口保持稳定再站稳。',
  },
  {
    id: 'buffer-jump',
    name: '缓冲跳跃',
    targets: ['landing-buffer'],
    unit: 'reps',
    sets: 3,
    reps: 6,
    restSeconds: 75,
    setSeconds: 34,
    cue: '接触地面到最低点之间留出适度缓冲，避免僵硬落地。',
  },
  {
    id: 'single-leg-balance-squat',
    name: '单腿平衡蹲',
    targets: ['knee-asymmetry'],
    unit: 'reps',
    sets: 3,
    reps: 6,
    restSeconds: 60,
    setSeconds: 40,
    cue: '左右腿分别完成，弱侧多留意膝盖方向，两侧次数保持一致。',
  },
]

/** 通用动态热身：不针对具体指标，用于把身体带进训练状态。 */
export const WARMUP_EXERCISES: readonly Exercise[] = [
  {
    id: 'warmup-march',
    name: '原地摆臂小步跑',
    targets: [],
    unit: 'seconds',
    sets: 2,
    reps: 90,
    restSeconds: 30,
    setSeconds: 90,
    cue: '小幅快频，手臂自然前后摆动，把心率逐步带起来。',
  },
  {
    id: 'warmup-lunge-walk',
    name: '动态弓步走',
    targets: [],
    unit: 'reps',
    sets: 3,
    reps: 8,
    restSeconds: 30,
    setSeconds: 40,
    cue: '每侧 8 次，前腿膝盖不超过脚尖，后腿髋部主动下沉。',
  },
  {
    id: 'warmup-arm-circle',
    name: '肩绕环与摆臂激活',
    targets: [],
    unit: 'seconds',
    sets: 2,
    reps: 40,
    restSeconds: 20,
    setSeconds: 40,
    cue: '由小到大绕环，再过渡到前后摆臂，幅度逐步打开。',
  },
]

/** 放松整理：静态拉伸，帮助训练后恢复。 */
export const COOLDOWN_EXERCISES: readonly Exercise[] = [
  {
    id: 'cooldown-quad',
    name: '股四头肌拉伸',
    targets: [],
    unit: 'seconds',
    sets: 2,
    reps: 30,
    restSeconds: 20,
    setSeconds: 30,
    cue: '每侧保持 30 秒，站稳后轻拉脚踝，不要憋气。',
  },
  {
    id: 'cooldown-hamstring',
    name: '腘绳肌拉伸',
    targets: [],
    unit: 'seconds',
    sets: 2,
    reps: 30,
    restSeconds: 20,
    setSeconds: 30,
    cue: '每侧保持 30 秒，膝盖微屈，感受大腿后侧舒展即可。',
  },
  {
    id: 'cooldown-calf-hip',
    name: '小腿与髋部拉伸',
    targets: [],
    unit: 'seconds',
    sets: 2,
    reps: 30,
    restSeconds: 20,
    setSeconds: 30,
    cue: '每侧保持 30 秒，先放松小腿，再顺势打开髋部。',
  },
]

export function findExerciseForMetric(metricId: MetricId): Exercise | undefined {
  return EXERCISES.find((exercise) => exercise.targets.includes(metricId))
}
