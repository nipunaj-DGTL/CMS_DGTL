import { expect, test, type Page } from '@playwright/test'

const cmsOrigin = process.env.E2E_CMS_ORIGIN ?? 'http://localhost:3000'
const adminEmail = process.env.E2E_ADMIN_EMAIL
const adminPassword = process.env.E2E_ADMIN_PASSWORD
const maxNavigationMs = Number(process.env.E2E_MAX_NAVIGATION_MS ?? 10_000)

type PublicSite = {
  expectedTitle: RegExp
  name: string
  origin: string
}

const publicSites = [
  {
    expectedTitle: /client 01/i,
    name: 'Client 01',
    origin: process.env.E2E_CLIENT01_ORIGIN,
  },
  {
    expectedTitle: /client 02|dgtl 360/i,
    name: 'DGTL360',
    origin: process.env.E2E_DGTL360_ORIGIN,
  },
].filter((site): site is PublicSite => Boolean(site.origin))

const browserErrors = (page: Page): Error[] => {
  const errors: Error[] = []
  page.on('pageerror', (error) => errors.push(error))
  return errors
}

const expectAccessibilityBasics = async (page: Page) => {
  await expect(page.locator('html')).toHaveAttribute('lang', /\S+/)
  await expect(page).toHaveTitle(/\S+/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)

  const violations = await page.evaluate(() => {
    const duplicateIds = Array.from(document.querySelectorAll<HTMLElement>('[id]'))
      .map((element) => element.id)
      .filter((id, index, ids) => id && ids.indexOf(id) !== index)
    const imagesWithoutAlt = Array.from(document.querySelectorAll('img:not([alt])')).length
    const unnamedButtons = Array.from(document.querySelectorAll('button')).filter(
      (button) => !button.textContent?.trim() && !button.getAttribute('aria-label') && !button.getAttribute('aria-labelledby'),
    ).length

    return { duplicateIds: [...new Set(duplicateIds)], imagesWithoutAlt, unnamedButtons }
  })

  expect(violations).toEqual({ duplicateIds: [], imagesWithoutAlt: 0, unnamedButtons: 0 })
}

test.describe('production readiness browser gate', () => {
  test.describe.configure({ timeout: 120_000 })

  test('company administrator can sign in and reach the CMS dashboard', async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')
    const errors = browserErrors(page)

    const response = await page.goto(`${cmsOrigin}/admin/login`, { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBe(200)
    await page.getByLabel(/email/i).fill(adminEmail!)
    await page.getByLabel(/password/i).fill(adminPassword!)
    await page.getByRole('button', { name: /login|sign in/i }).click()
    await expect(page).not.toHaveURL(/\/admin\/login(?:\?|$)/, { timeout: 60_000 })
    await expect(page.locator('body')).toContainText(/DGTL|dashboard|collections/i)
    expect(errors).toEqual([])
  })

  for (const site of publicSites) {
    test(`${site.name} renders accessibly within the navigation budget`, async ({ page }) => {
      const errors = browserErrors(page)
      const response = await page.goto(site.origin, { waitUntil: 'domcontentloaded' })
      expect(response?.status()).toBe(200)
      await expect(page).toHaveTitle(site.expectedTitle)
      await expectAccessibilityBasics(page)

      const duration = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0]
        return navigation?.duration ?? Number.POSITIVE_INFINITY
      })
      expect(duration).toBeLessThan(maxNavigationMs)
      expect(errors).toEqual([])
    })
  }
})
