import { test, expect } from "@playwright/test";
import { withTheme } from "./fixtures";
import { loadHtml } from "./http";
import { MA } from "./ma";

test.describe("Header & footer", () => {
  test("header renders navigation, cart count and mobile drawer", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, MA.paths.home);

    const nav = page.locator(".site-header__nav");
    await expect(nav.locator("a")).toHaveCount(4);
    await expect(nav.locator(`a[href$="${MA.paths.exhibitions}"]`)).toHaveCount(1);
    await expect(nav.locator(`a[href$="${MA.paths.showroom}"]`)).toHaveCount(1);
    await expect(nav.locator(`a[href$="${MA.paths.shop}"]`)).toHaveCount(1);

    await expect(page.locator("[data-cart-count]")).toHaveText(/^\d+$/);
    await expect(page.locator(".site-header__drawer summary")).toHaveAttribute("aria-label", /.+/);
    await expect(page.locator(".site-header__drawer-nav a")).toHaveCount(4);
  });

  test("current page is marked in the navigation", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, MA.paths.showroom);
    await expect(page.locator(`.site-header__nav a[aria-current="page"]`)).toHaveAttribute("href", new RegExp(`${MA.paths.showroom}$`));
  });

  test("footer lists policies and the footer menu, newsletter is off by default", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, MA.paths.home);
    const legal = page.locator("[data-footer-legal]");
    await expect(legal.locator("a").first()).toBeAttached();
    await expect(page.locator(".site-footer__list a", { hasText: /Suche|Search/ })).toHaveCount(1);
    await expect(page.locator("#FooterNewsletter")).toHaveCount(0);
  });

  test("burger opens and closes the mobile menu", { tag: "@browser" }, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile only");
    await page.goto(withTheme(MA.paths.home));
    const burger = page.locator(".site-header__burger");
    await expect(page.locator(".site-header__nav")).toBeHidden();
    await burger.click();
    await expect(page.locator(".site-header__drawer-nav")).toBeVisible();
    await burger.click();
    await expect(page.locator(".site-header__drawer-nav")).toBeHidden();
  });

  test("burger is hidden on desktop", { tag: "@browser" }, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop only");
    await page.goto(withTheme(MA.paths.home));
    await expect(page.locator(".site-header__burger")).toBeHidden();
    await expect(page.locator(".site-header__nav")).toBeVisible();
  });
});
