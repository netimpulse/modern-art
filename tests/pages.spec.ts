import { test, expect } from "@playwright/test";
import { withTheme } from "./fixtures";
import { loadHtml } from "./http";
import { MA, productPath } from "./ma";

const pages: Array<[string, number]> = [
  [MA.paths.home, 200],
  [MA.paths.shop, 200],
  [productPath(MA.products.unique), 200],
  [MA.paths.cart, 200],
  [MA.paths.exhibitions, 200],
  [MA.paths.showroom, 200],
  [MA.paths.about, 200],
  [MA.paths.search, 200],
  [MA.paths.notFound, 404],
];

test.describe("All main pages", () => {
  for (const [path, status] of pages) {
    test(`${path} renders with status ${status}, main landmark and styles`, { tag: "@http" }, async ({ page, request }) => {
      const html = await loadHtml(page, request, path, status);
      await expect(page.locator("main#MainContent")).toHaveCount(1);
      await expect(page.locator("h1")).not.toHaveCount(0);
      expect(html).toMatch(/base\.css/);
      // No inline style attributes from the theme (project rule); Shopify's own
      // injected markup (preview bar, pixels) lives outside <main>.
      const inline = await page.locator("main [style]").count();
      expect(inline, `${path} has inline style attributes in <main>`).toBe(0);
    });
  }

  test("no console errors on the main pages", { tag: "@browser" }, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const [path] of pages) {
      await page.goto(withTheme(path));
    }
    expect(errors).toEqual([]);
  });
});
