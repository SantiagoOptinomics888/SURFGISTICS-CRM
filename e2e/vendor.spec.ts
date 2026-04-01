import { test, expect } from "@playwright/test";
import { loginAs, logout, VENDOR } from "./helpers/auth";

test.describe("Vendor dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, VENDOR);
    await expect(page).toHaveURL(/\/vendor/);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test("shows vendor dashboard", async ({ page }) => {
    await expect(page.getByText("API Connection")).toBeVisible();
  });

  test("sidebar shows vendor navigation links", async ({ page }) => {
    const nav = page.locator("aside nav");
    await expect(nav.getByRole("link", { name: "In-Bond", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Arts & Parts", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "FTZ Line Items", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Tally Out", exact: true })).toBeVisible();
  });

  test("navigates to In-Bond page", async ({ page }) => {
    await page.locator("aside nav").getByRole("link", { name: "In-Bond", exact: true }).click();
    await expect(page).toHaveURL(/\/vendor\/inbonds/);
  });

  test("navigates to Arts & Parts page", async ({ page }) => {
    await page.locator("aside nav").getByRole("link", { name: "Arts & Parts", exact: true }).click();
    await expect(page).toHaveURL(/\/vendor\/arts-parts/);
  });

  test("navigates to FTZ Line Items page", async ({ page }) => {
    await page.locator("aside nav").getByRole("link", { name: "FTZ Line Items", exact: true }).click();
    await expect(page).toHaveURL(/\/vendor\/ftz-line-items/);
  });

  test("navigates to Tally Out page", async ({ page }) => {
    await page.locator("aside nav").getByRole("link", { name: "Tally Out", exact: true }).click();
    await expect(page).toHaveURL(/\/vendor\/tally-out/);
  });

  test("manager cannot access /vendor", async ({ page }) => {
    await logout(page);
    await page.evaluate(() => {
      localStorage.setItem("user", JSON.stringify({ role: "manager", email: "mgr@test.com" }));
      localStorage.setItem("access_token", "fake-token");
    });
    await page.goto("/vendor");
    await expect(page).toHaveURL(/\/manager|\/login/);
  });
});
