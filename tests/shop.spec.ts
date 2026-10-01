import { test, expect } from "@playwright/test";
import { withTheme } from "./fixtures";
import { loadHtml } from "./http";
import { MA, variantId } from "./ma";

test.describe("Shop & cart", () => {
  test("collection grid shows the demo artworks with state badges", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, MA.paths.shop);
    const cards = page.locator("[data-shop-grid] [data-artwork-card]");
    await expect(cards).toHaveCount(10);
    await expect(page.locator('[data-artwork-card][data-state="sold"]')).toHaveCount(2);
    await expect(page.locator('[data-artwork-card][data-state="edition"]')).toHaveCount(2);
    await expect(page.locator('[data-artwork-card][data-state="request"]')).toHaveCount(1);
    await expect(page.locator('[data-artwork-card][data-state="request"] [data-price]')).toHaveCount(0);
    await expect(page.locator("[data-results-count]")).toContainText("10");
    // First row is eager-loaded, the rest lazy.
    await expect(cards.first().locator("img")).toHaveAttribute("loading", "eager");
    await expect(cards.last().locator("img")).toHaveAttribute("loading", "lazy");
  });

  test("sorting by price ascending orders the prices", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, `${MA.paths.shop}?sort_by=price-ascending`);
    const prices = await page.locator("[data-shop-grid] [data-price]").allTextContents();
    const values = prices.map((p) => Number(p.replace(/[^\d]/g, "")));
    expect(values.length).toBeGreaterThan(2);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });

  test("availability filter hides sold works (skipped if not enabled in the admin)", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, MA.paths.shop);
    const availability = page.locator('[data-filter="filter.v.availability"]');
    test.skip((await availability.count()) === 0, "Availability filter not enabled in Search & Discovery");
    await loadHtml(page, request, `${MA.paths.shop}?filter.v.availability=1`);
    await expect(page.locator('[data-artwork-card][data-state="sold"]')).toHaveCount(0);
  });

  test("impossible price filter shows the empty state (skipped if not enabled)", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, MA.paths.shop);
    test.skip((await page.locator('[data-filter="price"]').count()) === 0, "Price filter not enabled in Search & Discovery");
    await loadHtml(page, request, `${MA.paths.shop}?filter.v.price.gte=999999`);
    await expect(page.locator("[data-shop-empty]")).toBeAttached();
  });

  test("empty cart shows the empty state with a shop link", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, MA.paths.cart);
    await expect(page.locator("[data-cart-empty] a.btn")).toHaveAttribute("href", /\/collections\//);
  });

  // Cart mutations from a non-browser client trip Shopify's bot protection for a
  // while (HTTP 429 on every following request), so pages with cart content are
  // checked in real browsers (@browser).
  test("cart page: fixed quantity for originals, legal note, request warning", { tag: "@browser" }, async ({ page }) => {
    await page.goto(withTheme(MA.paths.home));
    const unique = await variantId(page.request, MA.products.unique);
    const onRequest = await variantId(page.request, MA.products.priceOnRequest);
    await page.request.post("/cart/clear.js");
    await page.request.post("/cart/add.js", { data: { items: [{ id: unique, quantity: 1 }, { id: onRequest, quantity: 1 }] } });
    await page.goto(withTheme(MA.paths.cart));
    await expect(page.locator("[data-cart-item]")).toHaveCount(2);
    await expect(page.locator('[data-cart-item][data-unique="true"] input[name="updates[]"][type="hidden"]').first()).toHaveValue("1");
    await expect(page.locator("[data-request-warning]")).toHaveCount(1);
    await expect(page.locator("[data-price-note]")).toBeVisible();
    await page.locator("[data-cart-item] .cart-item__remove").first().click();
    await expect(page.locator("[data-cart-item]")).toHaveCount(1);
    await page.request.post("/cart/clear.js");
  });

  test("no horizontal scroll on the shop at 320 px", { tag: "@browser" }, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 700 }, storageState: "playwright/.auth/storefront.json" });
    const page = await context.newPage();
    await page.goto(withTheme(MA.paths.shop));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await context.close();
  });
});
