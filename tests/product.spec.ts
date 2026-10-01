import { test, expect } from "@playwright/test";
import { withTheme } from "./fixtures";
import { loadHtml } from "./http";
import { MA, productPath, variantId } from "./ma";

const buyBox = "art-buy-box";

// Cart endpoints are theme-independent; a preview_theme_id query would turn the
// POST into a redirected GET, so cart calls never use withTheme().

test.describe("Artwork page & buy box", () => {
  test("unique work: price, legal note, fixed quantity, LCP image", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, productPath(MA.products.unique));
    const box = page.locator(buyBox);
    await expect(box).toHaveAttribute("data-state", "unique");
    await expect(box.locator("[data-price]")).toHaveText(/\d/);
    await expect(box.locator("[data-price-note]")).toBeAttached();
    await expect(box.locator('input[name="quantity"][type="hidden"]')).toHaveValue("1");
    await expect(box.locator("[data-buy-submit]")).toBeEnabled();
    await expect(page.locator(".product-detail__image")).toHaveAttribute("fetchpriority", "high");
    await expect(page.locator("[data-artwork-facts] [data-artwork-dimensions]")).toContainText("120 × 100 × 3 cm");
    await expect(page.locator(".product-detail__views input")).toHaveCount(2);
  });

  test("sold work: disabled button, no form", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, productPath(MA.products.uniqueSold));
    const box = page.locator(buyBox);
    await expect(box).toHaveAttribute("data-state", "sold");
    await expect(box.locator("[data-buy-submit]")).toBeDisabled();
    await expect(box.locator("form")).toHaveCount(0);
  });

  test("edition: stock line and quantity limited to stock", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, productPath(MA.products.edition));
    const box = page.locator(buyBox);
    await expect(box).toHaveAttribute("data-state", "edition");
    await expect(box.locator("[data-buy-stock]")).toContainText("7");
    await expect(box.locator("[data-buy-stock]")).toContainText("10");
    await expect(box.locator('input[name="quantity"][type="number"]')).toHaveAttribute("max", "7");
  });

  test("sold-out edition counts as sold", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, productPath(MA.products.editionSoldOut));
    await expect(page.locator(buyBox)).toHaveAttribute("data-state", "sold");
  });

  test("price on request: no price, inquiry form with artwork reference", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, productPath(MA.products.priceOnRequest));
    const box = page.locator(buyBox);
    await expect(box).toHaveAttribute("data-state", "request");
    await expect(box.locator("[data-price]")).toHaveCount(0);
    await expect(box.locator("form[data-buy-form]")).toHaveCount(0);
    await expect(page.locator("form#ArtInquiry")).toHaveCount(1);
    await expect(page.locator("[data-inquiry-artwork]")).toHaveValue(/Großes Rauschen/);
  });

  test("work without dimensions: no size facts, no size comparison", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, productPath(MA.products.noDimensions));
    await expect(page.locator(".product-detail__info [data-artwork-dimensions]")).toHaveCount(0);
    await expect(page.locator(".product-detail__views")).toHaveCount(0);
  });

  // @cart: mutates the cart via HTTP. Run last and separately (npm run qa:http:cart):
  // after cart POSTs Shopify's bot protection answers further requests with 429
  // for a while, so all reads happen before the first POST.
  test("cart API: 422 for sold works and a second original, no-JS form posts to the cart", { tag: ["@http", "@cart"] }, async ({ request }) => {
    const sold = await variantId(request, MA.products.uniqueSold);
    const unique = await variantId(request, MA.products.unique);

    const soldRes = await request.post("/cart/add.js", { data: { items: [{ id: sold, quantity: 1 }] } });
    expect(soldRes.status()).toBe(422);
    expect((await soldRes.json()).description).toBeTruthy();

    const first = await request.post("/cart/add.js", { data: { items: [{ id: unique, quantity: 1 }] } });
    expect(first.ok()).toBe(true);
    const second = await request.post("/cart/add.js", { data: { items: [{ id: unique, quantity: 1 }] } });
    expect(second.status()).toBe(422);

    await request.post("/cart/clear.js");
    const form = await request.post("/cart/add", { form: { id: String(unique), quantity: "1" }, maxRedirects: 0 });
    expect(form.status()).toBe(302);
    expect(form.headers()["location"]).toMatch(/\/cart/);
    await request.post("/cart/clear.js");
  });

  test("AJAX add updates the header count and reports a second add", { tag: "@browser" }, async ({ page }) => {
    await page.goto(withTheme(productPath(MA.products.unique)));
    const count = page.locator("[data-cart-count]").first();
    const before = Number(await count.textContent());
    await page.locator("[data-buy-submit]").click();
    await expect(page.locator("[data-buy-status]")).toHaveAttribute("data-type", "success");
    await expect(count).toHaveText(String(before + 1));
    await page.locator("[data-buy-submit]").click();
    await expect(page.locator("[data-buy-status]")).toHaveAttribute("data-type", "error");
    await expect(page.locator("[data-buy-submit]")).toBeEnabled();
    await page.request.post("/cart/clear.js");
  });

  test("size comparison toggles without JS", { tag: "@browser" }, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, storageState: "playwright/.auth/storefront.json" });
    const page = await context.newPage();
    await page.goto(withTheme(productPath(MA.products.largest)));
    await page.locator('.product-detail__views label').nth(1).click();
    await expect(page.locator(".product-detail__scale")).toBeVisible();
    await expect(page.locator(".product-detail__image")).toBeHidden();
    await context.close();
  });
});
