import { test, expect } from "@playwright/test";
import { VENDOR, MANAGER, logout } from "./helpers/auth";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await logout(page);
  });

  test("shows login form", async ({ page }) => {
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("shows demo credentials", async ({ page }) => {
    await expect(page.getByText("Demo credentials")).toBeVisible();
    await expect(page.getByRole("button", { name: /Vendor/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Manager/ })).toBeVisible();
  });

  test("demo button fills vendor credentials", async ({ page }) => {
    await page.getByRole("button", { name: /Vendor/ }).click();
    await expect(page.locator('input[type="email"]')).toHaveValue(VENDOR.email);
  });

  test("demo button fills manager credentials", async ({ page }) => {
    await page.getByRole("button", { name: /Manager/ }).click();
    await expect(page.locator('input[type="email"]')).toHaveValue(MANAGER.email);
  });

  test("shows error on wrong credentials", async ({ page }) => {
    await page.route(/auth\/token/, (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "Incorrect email or password" }) })
    );
    await page.fill('input[type="email"]', "wrong@surfgistics.com");
    await page.fill('input[type="password"]', "wrongpass");
    await page.click('button[type="submit"]');
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
  });

  test("vendor login redirects to /vendor", async ({ page }) => {
    await page.fill('input[type="email"]', VENDOR.email);
    await page.fill('input[type="password"]', VENDOR.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/vendor/);
  });

  test("manager login redirects to /manager", async ({ page }) => {
    await page.fill('input[type="email"]', MANAGER.email);
    await page.fill('input[type="password"]', MANAGER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/manager/);
  });

  test("unauthenticated / redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});
