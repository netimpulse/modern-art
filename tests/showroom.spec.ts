import { test, expect } from "@playwright/test";
import { withTheme } from "./fixtures";
import { loadHtml } from "./http";
import { MA } from "./ma";

test.describe("Virtual showroom", () => {
  test("base markup: real links to artworks, one template per work, sizes from metafields", { tag: "@http" }, async ({ page, request }) => {
    const html = await loadHtml(page, request, MA.paths.showroom);
    const works = page.locator("[data-showroom-list] [data-werk]");
    const count = await works.count();
    expect(count).toBeGreaterThan(3);
    expect(count).toBeLessThanOrEqual(24);
    for (const href of await works.evaluateAll((els) => els.map((el) => el.getAttribute("href")))) {
      expect(href).toMatch(/\/products\/ma-/);
    }
    await expect(page.locator("template[id^='ShowroomDetail-']")).toHaveCount(count);
    await expect(page.locator("[data-showroom-controls]")).toHaveAttribute("hidden", "");
    // Largest demo work (160 × 200 cm) gets its real size as custom properties.
    expect(html).toMatch(/--art-w:\s*160(\.0)?;\s*--art-h:\s*200(\.0)?;/);
    // A work without dimensions falls back to its image ratio at 60 cm height.
    expect(html).toMatch(/--art-h:\s*60;/);
  });

  test("dialog templates link price-on-request works to the inquiry form", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, MA.paths.showroom);
    const template = page.locator(`template[id$='-${MA.products.priceOnRequest}']`);
    const inner = await template.evaluate((t: HTMLTemplateElement) => t.innerHTML);
    expect(inner).toContain('data-state="request"');
    expect(inner).toContain("#ArtInquiry");
    expect(inner).not.toContain("<form");
  });

  test("3D room, dialog, URL parameter and focus return", { tag: "@browser" }, async ({ page }) => {
    await page.goto(withTheme(MA.paths.showroom));
    const showroom = page.locator("ma-showroom");
    await expect(showroom).toHaveClass(/is-3d/);
    const first = page.locator("[data-werk]").first();
    const handle = await first.getAttribute("data-werk");
    await first.click();
    await expect(page.locator("[data-showroom-dialog][open]")).toBeVisible();
    expect(new URL(page.url()).searchParams.get("werk")).toBe(handle);
    expect(new URL(page.url()).searchParams.get("preview_theme_id")).not.toBeNull();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-showroom-dialog][open]")).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get("werk")).toBeNull();
    await expect(first).toBeFocused();
  });

  test("deep link opens the dialog, unknown handles are ignored", { tag: "@browser" }, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(withTheme(`${MA.paths.showroom}?werk=${MA.products.unique}`));
    await expect(page.locator("[data-showroom-dialog][open]")).toBeVisible();
    await page.goto(withTheme(`${MA.paths.showroom}?werk=gibt-es-nicht`));
    await expect(page.locator("[data-showroom-dialog][open]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("arrow keys move focus between works", { tag: "@browser" }, async ({ page }) => {
    await page.goto(withTheme(MA.paths.showroom));
    const works = page.locator("[data-werk]");
    await works.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(works.nth(1)).toBeFocused();
  });

  test("larger works hang larger", { tag: "@browser" }, async ({ page }) => {
    await page.goto(withTheme(MA.paths.showroom));
    const large = await page.locator(`[data-werk="${MA.products.largest}"] .showroom__image`).boundingBox();
    const small = await page.locator(`[data-werk="${MA.products.smallest}"] .showroom__image`).boundingBox();
    expect(large && small && large.width > small.width).toBe(true);
  });

  test("reduced motion: no 3D, dialog still works", { tag: "@browser" }, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(withTheme(MA.paths.showroom));
    await expect(page.locator("ma-showroom")).not.toHaveClass(/is-3d/);
    await page.locator("[data-werk]").first().click();
    await expect(page.locator("[data-showroom-dialog][open]")).toBeVisible();
  });

  test("add to cart inside the dialog updates the header count", { tag: "@browser" }, async ({ page }) => {
    await page.request.post("/cart/clear.js");
    await page.goto(withTheme(`${MA.paths.showroom}?werk=${MA.products.unique}`));
    await page.locator("[data-showroom-dialog] [data-buy-submit]").click();
    await expect(page.locator("[data-cart-count]").first()).toHaveText("1");
    await page.request.post("/cart/clear.js");
  });
});
