import { expect, test } from '@playwright/test'

test('首页提供两个视频入口和正确的拍摄模式', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: '今天，先把这一跳看清楚。' })).toBeVisible()
  await page.getByRole('button', { name: '动作诊断', exact: true }).click()
  await expect(page.getByRole('heading', { name: '拍下这一跳，找到下一次的发力重点。' })).toBeVisible()
  await expect(page.getByRole('button', { name: '拍摄视频' })).toBeVisible()
  await expect(page.getByRole('button', { name: '选择已有视频' })).toBeVisible()
  await expect(page.locator('input[capture="environment"]')).toHaveAttribute('accept', 'video/*')
})

test('主界面可以进入历史报告和两个占位功能', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: '历史报告', exact: true }).click()
  await expect(page.getByRole('heading', { name: '历史报告' })).toBeVisible()

  await page.getByRole('button', { name: '训练计划', exact: true }).click()
  await expect(page.getByRole('heading', { name: '训练计划' })).toBeVisible()

  await page.getByRole('button', { name: '动作切换', exact: true }).click()
  await expect(page.getByRole('heading', { name: '动作切换' })).toBeVisible()
})

test('首页在当前视口没有横向溢出', async ({ page }) => {
  await page.goto('/')

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
})
