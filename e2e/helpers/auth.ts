import { Page } from "@playwright/test";

export const VENDOR = {
  email: "demo@surfgistics.com",
  password: "demo1234",
};

export const MANAGER = {
  email: "manager@surfgistics.com",
  password: "manager1234",
};

export async function loginAs(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
}

export async function logout(page: Page) {
  // Navigate to a real page first so localStorage is accessible
  await page.goto("/login");
  await page.evaluate(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
  });
}
