import { test, expect } from "@playwright/test";
import { withTheme } from "./fixtures";
import { loadHtml } from "./http";
import { MA } from "./ma";

test.describe("Home & about", () => {
  test("hero image is the LCP candidate, accent line keeps its text for screen readers", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, MA.paths.home);
    await expect(page.locator(".hero__image")).toHaveAttribute("fetchpriority", "high");
    await expect(page.locator(".hero__image")).toHaveAttribute("loading", "eager");
    await expect(page.locator(".hero__line--accent .visually-hidden")).toHaveText(/\S/);
    await expect(page.locator(".hero__chars")).toHaveAttribute("aria-hidden", "true");
  });

  test("marquee copy is hidden from assistive tech and keyboard", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, MA.paths.home);
    const copy = page.locator("[data-marquee-copy]");
    await expect(copy).toHaveAttribute("aria-hidden", "true");
    for (const tabindex of await copy.locator("a").evaluateAll((els) => els.map((el) => el.getAttribute("tabindex")))) {
      expect(tabindex).toBe("-1");
    }
  });

  test("featured works and teasers link to the right pages", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, MA.paths.home);
    expect(await page.locator("[data-featured-grid] [data-artwork-card]").count()).toBeGreaterThanOrEqual(3);
    const teasers = await page.locator("[data-teaser-link]").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    expect(teasers).toEqual(expect.arrayContaining([expect.stringMatching(/\/pages\/ma-ausstellungen$/), expect.stringMatching(/\/pages\/ma-showroom$/)]));
  });

  test("about page renders intro and page content", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, MA.paths.about);
    await expect(page.locator(".image-with-text .section-title")).toBeAttached();
    await expect(page.locator(".page-content__body")).toContainText("Farbe");
  });

  test("no horizontal scroll at 320 px on the main pages", { tag: "@browser" }, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 700 }, storageState: "playwright/.auth/storefront.json" });
    const page = await context.newPage();
    for (const path of [MA.paths.home, MA.paths.exhibitions, MA.paths.showroom, MA.paths.about, `/products/${MA.products.unique}`]) {
      await page.goto(withTheme(path));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    await context.close();
  });
});
