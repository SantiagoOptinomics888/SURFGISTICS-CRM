import { expect, test, type Page } from "@playwright/test";

const auth = { email: "client@example.com", role: "vendor", importer_account: "ACME", permissions: ["imports"], access_token: "test-client-token" };
const baseShipment = {
  id: 1, hbl: "HBL-CLIENT-100", status: "isf_automation_pending", shipment_type: null,
  client_email: auth.email, client_delivery_address: { name: "Client Warehouse", line1: "123 Harbor Street", city: "Miami", state: "FL", postal_code: "33101", country: "US" },
  created_at: "2026-09-14T10:00:00Z", updated_at: "2026-09-14T10:00:00Z", isf_processed_at: null, document_request_due_at: null,
  documents: [{ id: 1, document_type: "isf", file_name: "isf.txt", file_size: 8, created_at: "2026-09-14T10:00:00Z" }],
  events: [{ id: 1, title: "ISF uploaded", event_type: "isf_uploaded", created_at: "2026-09-14T10:00:00Z" }],
};
async function loginState(page: Page, permissions = ["imports"]) {
  await page.addInitScript((user) => {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("access_token", user.access_token);
  }, { ...auth, permissions });
}
async function mockApi(page: Page, seeded = true) {
  const shipments = seeded ? [structuredClone(baseShipment)] : [];
  let creates = 0;
  let uploads = 0;
  await page.route("https://api.surfgistics.com/**", async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    if (url.pathname === "/auth/token") return route.fulfill({ json: auth });
    if (url.pathname === "/shipments" && route.request().method() === "GET") return route.fulfill({ json: shipments });
    if (url.pathname === "/shipments/isf") {
      creates++;
      const body = route.request().postDataBuffer()?.toString() ?? "";
      expect(body).toContain("isf.txt");
      expect(body).not.toContain("delivery_name");
      shipments.push(structuredClone(baseShipment));
      return route.fulfill({ status: 201, json: shipments[0] });
    }
    if (url.pathname === "/shipments/HBL-CLIENT-100/documents") {
      uploads++;
      const body = route.request().postDataBuffer()?.toString() ?? "";
      expect(body).toContain("commercial_invoice");
      shipments[0].documents.push({ id: 2, document_type: "commercial_invoice", file_name: "invoice.pdf", file_size: 20, created_at: "2026-09-14T12:00:00Z" });
      return route.fulfill({ json: shipments[0] });
    }
    if (url.pathname === "/shipments/HBL-CLIENT-100/documents/1") return route.fulfill({ contentType: "text/plain", body: "HBL: HBL-CLIENT-100" });
    return route.fulfill({ status: 404, json: { detail: "Unexpected test request" } });
  });
  return { counts: () => ({ creates, uploads }) };
}

test("client sign-in opens shipment portal with only client navigation", async ({ page }) => {
  await mockApi(page);
  await page.goto("/login");
  await page.getByLabel("Email address").fill(auth.email);
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/client$/);
  await expect(page.getByRole("heading", { name: "Your shipments, in one place." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Automation", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Parts", exact: true })).toHaveCount(0);
});

test("client creates shipment by dropping documents only, then adds more and downloads", async ({ page }) => {
  await loginState(page);
  const state = await mockApi(page, false);
  await page.goto("/client/new");
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await page.getByLabel("ISF (required)", { exact: true }).setInputFiles({ name: "isf.txt", mimeType: "text/plain", buffer: Buffer.from("HBL: HBL-CLIENT-100") });
  await page.screenshot({ path: "qa/client-shipment-review.png", fullPage: true });
  expect(state.counts().creates).toBe(0);
  await page.getByRole("button", { name: "Submit shipment" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Shipment submitted" })).toContainText("no further details needed");
  expect(state.counts().creates).toBe(1);
  await page.getByLabel("Commercial invoice", { exact: true }).setInputFiles({ name: "invoice.pdf", mimeType: "application/pdf", buffer: Buffer.from("test invoice") });
  await expect(page.getByRole("status")).toContainText("invoice.pdf received");
  await expect(page.getByRole("button", { name: /invoice.pdf.*KB/ })).toBeVisible();
  expect(state.counts().uploads).toBe(1);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /isf.txt.*KB/ }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("isf.txt");
});

test("invalid file, failed request, and permission errors are visible", async ({ page }) => {
  await loginState(page);
  await mockApi(page);
  await page.goto("/client/new");
  await page.getByLabel("ISF (required)", { exact: true }).setInputFiles({ name: "empty.txt", mimeType: "text/plain", buffer: Buffer.from("") });
  await expect(page.getByRole("alert").filter({ hasText: "This file" })).toContainText("empty");
  await page.route("https://api.surfgistics.com/shipments", (route) => route.fulfill({ status: 503, json: { detail: "Unavailable" } }));
  await page.goto("/client");
  await expect(page.getByRole("alert").filter({ hasText: "could not load" })).toContainText("could not load");
});

test("clients without shipment permission cannot open the portal", async ({ page }) => {
  await loginState(page, []);
  await mockApi(page);
  await page.goto("/client");
  await expect(page.getByRole("heading", { name: "Access needed" })).toBeVisible();
});

test("mobile portal has no horizontal overflow and can open shipment details", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginState(page);
  await mockApi(page);
  await page.goto("/client");
  await page.getByRole("button", { name: /HBL-CLIENT-100/ }).click();
  await expect(page.getByRole("heading", { name: "Document checklist" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "qa/client-portal-mobile.png", fullPage: true });
});

test("desktop portal screenshot", async ({ page }) => {
  await loginState(page);
  await mockApi(page);
  await page.goto("/client?shipment=HBL-CLIENT-100");
  await expect(page.getByRole("heading", { name: "Document checklist" })).toBeVisible();
  await page.screenshot({ path: "qa/client-portal-desktop.png", fullPage: true });
});

test("administrator can configure a client account with the portal preset", async ({ page }) => {
  await page.addInitScript((user) => {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("access_token", user.access_token);
  }, { ...auth, email: "manager@example.com", role: "manager", importer_account: null, permissions: [] });
  let created = false;
  await page.route("https://api.surfgistics.com/admin/users", (route) => {
    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON();
      expect(payload.role).toBe("vendor");
      expect(payload.permissions).toEqual(["imports"]);
      expect(payload.importer_account).toBe("ACME");
      created = true;
      return route.fulfill({ status: 201, json: { ...payload, id: 99 } });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto("/manager/admin/users");
  await page.getByRole("button", { name: "Create User", exact: true }).click();
  await page.locator('form input[type="email"]').fill(auth.email);
  await page.locator('form input[type="password"]').fill("test-password");
  await page.getByPlaceholder("e.g. ALOHA").fill("ACME");
  await page.getByRole("button", { name: "Use client portal access" }).click();
  await page.locator("form").getByRole("button", { name: "Create User", exact: true }).click();
  await expect(page.getByRole("heading", { name: "New User" })).toHaveCount(0);
  expect(created).toBeTruthy();
});
