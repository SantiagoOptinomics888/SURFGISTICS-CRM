import { test, expect } from "@playwright/test";
import { loginAs, logout, MANAGER } from "./helpers/auth";

test.describe("Manager dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, MANAGER);
    await expect(page).toHaveURL(/\/manager/);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test("shows manager dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/\/manager/);
  });

  test("sidebar shows Vendors link", async ({ page }) => {
    await expect(page.locator("aside nav").getByRole("link", { name: "Vendors", exact: true })).toBeVisible();
  });

  test("navigates to vendors list", async ({ page }) => {
    await page.locator("aside nav").getByRole("link", { name: "Vendors", exact: true }).click();
    await expect(page).toHaveURL(/\/manager\/vendors/);
  });

  test("vendor cannot access /manager", async ({ page }) => {
    await logout(page);
    await page.evaluate(() => {
      localStorage.setItem("user", JSON.stringify({ role: "vendor", email: "v@test.com", importer_account: "ACME" }));
      localStorage.setItem("access_token", "fake-token");
    });
    await page.goto("/manager");
    await expect(page).toHaveURL(/\/vendor|\/login/);
  });
});
