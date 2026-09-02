import { expect, test } from '@playwright/test'

test('首页提供两个视频入口和正确的拍摄模式', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: '拍下这一跳，找到下一次的发力重点。' })).toBeVisible()
  await expect(page.getByRole('button', { name: '拍摄视频' })).toBeVisible()
  await expect(page.getByRole('button', { name: '选择已有视频' })).toBeVisible()
  await expect(page.locator('input[capture="environment"]')).toHaveAttribute('accept', 'video/*')
})

test('首页在当前视口没有横向溢出', async ({ page }) => {
  await page.goto('/')

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
})
