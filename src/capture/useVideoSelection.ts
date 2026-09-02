import { useCallback, useEffect, useRef, useState } from 'react'
import { isVideoFile, type VideoMetadata } from './video'

type SelectedVideo = {
  file: File
  url: string
}

export function useVideoSelection() {
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null)
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null)
  const [error, setError] = useState<string | null>(null)
  const selectedVideoRef = useRef<SelectedVideo | null>(null)

  const releaseVideo = useCallback((video: SelectedVideo | null) => {
    if (video) URL.revokeObjectURL(video.url)
  }, [])

  const clearVideo = useCallback(() => {
    releaseVideo(selectedVideoRef.current)
    selectedVideoRef.current = null
    setSelectedVideo(null)
    setVideoMetadata(null)
    setError(null)
  }, [releaseVideo])

  const selectVideo = useCallback(
    (file: File | null) => {
      if (!file) return
      if (!isVideoFile(file)) {
        setError('该文件不是可识别的视频，请重新拍摄或选择视频文件。')
        return
      }

      releaseVideo(selectedVideoRef.current)
      const nextVideo = { file, url: URL.createObjectURL(file) }
      selectedVideoRef.current = nextVideo
      setSelectedVideo(nextVideo)
      setVideoMetadata(null)
      setError(null)
    },
    [releaseVideo],
  )

  useEffect(
    () => () => {
      releaseVideo(selectedVideoRef.current)
      selectedVideoRef.current = null
    },
    [releaseVideo],
  )

  const handleLoadedMetadata = useCallback((event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget
    setVideoMetadata({
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    })
    setError(null)
  }, [])

  const handleVideoError = useCallback(() => {
    setVideoMetadata(null)
    setError('当前浏览器无法播放该视频，请使用系统相机重新拍摄或更换视频格式。')
  }, [])

  return {
    clearVideo,
    error,
    metadata: {
      handleLoadedMetadata,
      handleVideoError,
      value: videoMetadata,
    },
    selectVideo,
    selectedVideo,
  }
}
