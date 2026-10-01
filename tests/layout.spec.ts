import { test, expect } from "@playwright/test";
import { withTheme } from "./fixtures";
import { loadHtml } from "./http";
import { MA } from "./ma";

test.describe("Layout & design tokens", () => {
  test("skip link, main landmark and tokens are rendered", { tag: "@http" }, async ({ page, request }) => {
    const html = await loadHtml(page, request, MA.paths.home);

    const firstLink = page.locator("body a").first();
    await expect(firstLink).toHaveClass(/skip-link/);
    await expect(firstLink).toHaveAttribute("href", "#MainContent");
    await expect(page.locator("main#MainContent")).toHaveCount(1);

    expect(html).toMatch(/--color-background:\s*#/i);
    expect(html).toMatch(/--color-accent-1:\s*#/i);
    expect(html).toMatch(/\.color-scheme-1\s*\{/);
    expect(html).toMatch(/base\.css/);
    // Bundled fonts are self-hosted: no request to an external font CDN.
    expect(html).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
    expect(html).toMatch(/syne-latin\.woff2/);
  });

  test("German storefront sets lang=de", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, `/de${MA.paths.home}`);
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expect(page.locator(".skip-link")).toHaveText("Zum Inhalt springen");
  });

  test("skip link is the first focus stop and moves focus to main", { tag: "@browser" }, async ({ page }) => {
    await page.goto(withTheme(MA.paths.home));
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#MainContent")).toBeFocused();
  });

  test("reduced motion disables animations", { tag: "@browser" }, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(withTheme(MA.paths.home));
    const names = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".blob, .badge-rotate svg, .dot--live")).map(
        (el) => getComputedStyle(el).animationName
      )
    );
    for (const name of names) expect(name).toBe("none");
  });
});
