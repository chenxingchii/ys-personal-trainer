import type { MetricId } from '../biomechanics/types'

export const JUMP_RULE_VERSION = 'mvp-v0.1'

export type JumpRule = {
  id: MetricId
  label: string
  target: number
  range: [number, number]
  tolerance: number
  weight: number
  hint: string
}

export const JUMP_RULES: readonly JumpRule[] = [
  {
    id: 'pre-squat-knee',
    label: '预蹲膝角',
    target: 105,
    range: [90, 120],
    tolerance: 15,
    weight: 0.15,
    hint: '预蹲时保持稳定下沉，不要过深或过浅。',
  },
  {
    id: 'takeoff-knee',
    label: '离地膝角',
    target: 168,
    range: [160, 176],
    tolerance: 8,
    weight: 0.25,
    hint: '离地前主动完成髋、膝、踝的连续伸展。',
  },
  {
    id: 'backward-arm',
    label: '后摆臂',
    target: -30,
    range: [-40, -20],
    tolerance: 10,
    weight: 0.1,
    hint: '预蹲时手臂向后摆出，为起跳蓄力。',
  },
  {
    id: 'forward-arm',
    label: '前摆臂',
    target: 95,
    range: [80, 110],
    tolerance: 15,
    weight: 0.1,
    hint: '起跳时快速向前上方摆臂，和蹬伸保持同步。',
  },
  {
    id: 'arm-swing-range',
    label: '摆臂总幅度',
    target: 130,
    range: [110, 150],
    tolerance: 20,
    weight: 0.1,
    hint: '让后摆到前摆形成完整、连贯的摆臂幅度。',
  },
  {
    id: 'landing-contact-knee',
    label: '落地接触膝角',
    target: 155,
    range: [145, 165],
    tolerance: 10,
    weight: 0.1,
    hint: '落地时保持膝盖有弹性的屈曲，避免完全锁死。',
  },
  {
    id: 'landing-lowest-knee',
    label: '落地最低膝角',
    target: 112,
    range: [97, 127],
    tolerance: 15,
    weight: 0.1,
    hint: '落地后顺势屈膝吸收冲击，再逐步稳定身体。',
  },
  {
    id: 'landing-buffer',
    label: '落地缓冲幅度',
    target: 50,
    range: [40, 60],
    tolerance: 10,
    weight: 0.05,
    hint: '接触到最低点之间留出适度缓冲，不要僵硬落地。',
  },
  {
    id: 'knee-asymmetry',
    label: '左右膝角差',
    target: 0,
    range: [0, 10],
    tolerance: 10,
    weight: 0.05,
    hint: '两侧膝角尽量接近；侧面遮挡严重时不作判断。',
  },
]
