import { useEffect, useRef } from 'react'
import { drawPose } from './drawPose'
import type { PoseFrame } from './types'

type PoseOverlayProps = {
  frame: PoseFrame
}

export function PoseOverlay({ frame }: PoseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d')
    if (context) drawPose(context, frame)
  }, [frame])

  return (
    <canvas
      ref={canvasRef}
      className="pose-overlay"
      width={frame.imageWidth}
      height={frame.imageHeight}
      aria-hidden="true"
    />
  )
}
