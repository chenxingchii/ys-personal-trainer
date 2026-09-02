import type { PoseFrame, PoseLandmark } from './types'

export const POSE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 7],
  [0, 4],
  [4, 5],
  [5, 6],
  [6, 8],
  [9, 10],
  [11, 12],
  [11, 13],
  [13, 15],
  [15, 17],
  [15, 19],
  [15, 21],
  [17, 19],
  [12, 14],
  [14, 16],
  [16, 18],
  [16, 20],
  [16, 22],
  [18, 20],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [24, 26],
  [25, 27],
  [26, 28],
  [27, 29],
  [28, 30],
  [29, 31],
  [30, 32],
  [27, 31],
  [28, 32],
]

const MIN_VISIBILITY = 0.45

function isVisible(landmark: PoseLandmark | undefined): landmark is PoseLandmark {
  return Boolean(landmark && (landmark.visibility ?? 1) >= MIN_VISIBILITY)
}

export function drawPose(context: CanvasRenderingContext2D, frame: PoseFrame) {
  const { width, height } = context.canvas
  const scale = Math.max(1, Math.min(width, height) / 720)
  context.clearRect(0, 0, width, height)
  context.lineCap = 'round'
  context.lineJoin = 'round'

  const visibleConnections = POSE_CONNECTIONS.flatMap(([startIndex, endIndex]) => {
    const start = frame.landmarks[startIndex]
    const end = frame.landmarks[endIndex]
    return isVisible(start) && isVisible(end) ? [[start, end] as const] : []
  })

  for (const [lineWidth, strokeStyle] of [
    [9 * scale, 'rgba(12, 20, 17, 0.76)'],
    [4 * scale, '#d5eb63'],
  ] as const) {
    context.lineWidth = lineWidth
    context.strokeStyle = strokeStyle
    context.beginPath()
    visibleConnections.forEach(([start, end]) => {
      context.moveTo(start.x * width, start.y * height)
      context.lineTo(end.x * width, end.y * height)
    })
    context.stroke()
  }

  frame.landmarks.forEach((landmark) => {
    if (!isVisible(landmark)) return
    const x = landmark.x * width
    const y = landmark.y * height
    context.beginPath()
    context.arc(x, y, 7 * scale, 0, Math.PI * 2)
    context.fillStyle = '#17211d'
    context.fill()
    context.beginPath()
    context.arc(x, y, 3.5 * scale, 0, Math.PI * 2)
    context.fillStyle = '#d5eb63'
    context.fill()
  })
}
