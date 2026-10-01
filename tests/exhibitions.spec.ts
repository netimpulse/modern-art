import { test, expect } from "@playwright/test";
import { loadHtml } from "./http";
import { MA } from "./ma";

const DAY = 86_400;

/**
 * The grouping depends on "now", so the specs check invariants against the
 * current time (±1 day tolerance for the shop time zone) instead of fixed names.
 */
test.describe("Exhibitions", () => {
  test("groups follow the dates: now showing, upcoming ascending, archive descending", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, MA.paths.exhibitions);
    const now = Date.now() / 1000;

    const read = async (selector: string) =>
      page.locator(selector).evaluateAll((els) =>
        els.map((el) => ({
          start: Number(el.getAttribute("data-start")),
          end: Number(el.getAttribute("data-end")),
          valid: el.getAttribute("data-valid") !== "false",
        }))
      );

    const current = await read('[data-group="current"] [data-exhibition]');
    for (const e of current) {
      expect(e.start).toBeLessThanOrEqual(now + DAY);
      expect(e.end).toBeGreaterThanOrEqual(now - DAY);
    }

    const upcoming = (await read('[data-group="upcoming"] [data-exhibition]')).filter((e) => e.valid);
    for (const e of upcoming) expect(e.start).toBeGreaterThan(now - DAY);
    const starts = upcoming.map((e) => e.start);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);

    const past = await read('[data-group="past"] [data-exhibition]');
    for (const e of past) expect(e.end).toBeLessThan(now + DAY);
    const ends = past.map((e) => e.end);
    expect([...ends].sort((a, b) => b - a)).toEqual(ends);

    expect(current.length + upcoming.length + past.length).toBeGreaterThanOrEqual(5);
  });

  test("entries with an invalid date are listed last under upcoming as 'date to be announced'", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, MA.paths.exhibitions);
    const items = page.locator('[data-group="upcoming"] [data-exhibition]');
    const last = items.last();
    await expect(last).toHaveAttribute("data-valid", "false");
    await expect(last).toContainText(/Termin folgt|Date to be announced/);
    // A year-only value like "2027" must not end up in the archive as a 1970 date.
    const pastStarts = await page.locator('[data-group="past"] [data-exhibition]').evaluateAll((els) =>
      els.map((el) => Number(el.getAttribute("data-start")))
    );
    for (const start of pastStarts) expect(start).toBeGreaterThan(946_684_800); // after 2000-01-01
  });

  test("the next upcoming exhibition is the feature card", { tag: "@http" }, async ({ page, request }) => {
    await loadHtml(page, request, MA.paths.exhibitions);
    await expect(page.locator('[data-group="upcoming"] .exhibition--feature')).toHaveCount(1);
    await expect(page.locator('[data-group="upcoming"] [data-exhibition]').first()).toHaveClass(/exhibition--feature/);
  });

  test("section without blocks renders the empty state", { tag: "@http" }, async ({ page, request }) => {
    // Rendering the section file by name uses its defaults, i.e. no blocks.
    await loadHtml(page, request, `${MA.paths.exhibitions}?section_id=exhibitions`);
    await expect(page.locator("[data-exhibitions-empty]")).toHaveCount(1);
    await expect(page.locator("[data-exhibition]")).toHaveCount(0);
  });
});
