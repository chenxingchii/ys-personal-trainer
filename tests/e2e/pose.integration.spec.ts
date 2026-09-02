import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'

test('真实 MediaPipe 模型能够识别人体并显示骨架', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  const browserErrors: string[] = []
  page.on('pageerror', (error) => browserErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })

  await page.goto('/')
  const image = await readFile(path.resolve('tests/fixtures/pose.jpg'))
  const videoBytes = await page.evaluate(async (sourceBytes) => {
    const imageBlob = new Blob([new Uint8Array(sourceBytes)], { type: 'image/jpeg' })
    const bitmap = await createImageBitmap(imageBlob)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')!
    const stream = canvas.captureStream(10)
    const chunks: Blob[] = []
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' })
    recorder.addEventListener('dataavailable', (event) => chunks.push(event.data))
    const stopped = new Promise<void>((resolve) => recorder.addEventListener('stop', () => resolve()))

    recorder.start(100)
    for (let frame = 0; frame < 8; frame += 1) {
      context.drawImage(bitmap, 0, 0)
      await new Promise((resolve) => window.setTimeout(resolve, 100))
    }
    recorder.stop()
    await stopped
    bitmap.close()
    stream.getTracks().forEach((track) => track.stop())

    return Array.from(new Uint8Array(await new Blob(chunks, { type: recorder.mimeType }).arrayBuffer()))
  }, Array.from(image))

  await page.locator('input[type="file"]:not([capture])').setInputFiles({
    name: 'pose-test.webm',
    mimeType: 'video/webm',
    buffer: Buffer.from(videoBytes),
  })

  await expect(page.getByRole('button', { name: '识别当前帧' })).toBeVisible()
  await page.getByRole('button', { name: '识别当前帧' }).click()

  await expect(page.getByText('骨架已锁定')).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.pose-overlay')).toBeVisible()
  await expect(page.getByText(/已识别 33 个关键点/)).toBeVisible()
  const drawnPixelSamples = await page.locator<HTMLCanvasElement>('.pose-overlay').evaluate((canvas) => {
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
    let visibleSamples = 0
    for (let alpha = 3; alpha < pixels.length; alpha += 16) {
      if (pixels[alpha] > 0) visibleSamples += 1
    }
    return visibleSamples
  })
  expect(drawnPixelSamples).toBeGreaterThan(100)

  const pageWidth = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }))
  expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.client)
  expect(browserErrors).toEqual([])
  await testInfo.attach('姿态识别结果', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })
})
