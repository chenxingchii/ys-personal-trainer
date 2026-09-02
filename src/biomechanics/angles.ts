import type { PoseFrame, PoseLandmark } from '../pose/types'

export const POSE_LANDMARKS = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const

export type Point = Pick<PoseLandmark, 'x' | 'y'>

export function calculateAngle(first: Point, vertex: Point, last: Point): number | undefined {
  const firstVector = { x: first.x - vertex.x, y: first.y - vertex.y }
  const lastVector = { x: last.x - vertex.x, y: last.y - vertex.y }
  const firstLength = Math.hypot(firstVector.x, firstVector.y)
  const lastLength = Math.hypot(lastVector.x, lastVector.y)
  if (firstLength < 1e-6 || lastLength < 1e-6) return undefined
  const cosine = (firstVector.x * lastVector.x + firstVector.y * lastVector.y) / (firstLength * lastLength)
  return (Math.acos(Math.max(-1, Math.min(1, cosine))) * 180) / Math.PI
}

export function calculateSignedArmAngle(
  shoulder: Point,
  elbow: Point,
  forwardDirection: -1 | 1,
): number | undefined {
  const vector = { x: (elbow.x - shoulder.x) * forwardDirection, y: elbow.y - shoulder.y }
  if (Math.hypot(vector.x, vector.y) < 1e-6) return undefined
  return (Math.atan2(vector.x, vector.y) * 180) / Math.PI
}

export function calculateVerticalAngle(top: Point, bottom: Point): number | undefined {
  const vector = { x: top.x - bottom.x, y: top.y - bottom.y }
  if (Math.hypot(vector.x, vector.y) < 1e-6) return undefined
  return (Math.atan2(Math.abs(vector.x), Math.abs(vector.y)) * 180) / Math.PI
}

export function visibilityOf(landmark: PoseLandmark | undefined): number {
  if (!landmark) return 0
  return Math.max(0, Math.min(1, landmark.visibility ?? landmark.presence ?? 1))
}

export function pointOf(frame: PoseFrame, index: number): Point | undefined {
  const landmark = frame.landmarks[index]
  return visibilityOf(landmark) >= 0.35 ? landmark : undefined
}
