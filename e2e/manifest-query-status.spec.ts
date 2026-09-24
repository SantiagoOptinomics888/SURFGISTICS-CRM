import { expect, test, type Page } from "@playwright/test";

// Mirrors production log 146 (2026-09-16): an ISF / manual-MBL request that the
// worker rejected before opening AceLynk. All API traffic is mocked.
const rejectedQueryOnlyJob = {
  id: 146, created_at: "2026-09-16T10:33:41Z", processed_at: "2026-09-16T10:34:13Z", resource_type: "e214_entry_header",
  importer_account: "DELT00001", identifier: "ONEYNB6BDAN89800", query_fingerprint: "fp-146", status: "failed",
  error_message: "Manifest Query queue payload validation failed.", retried_count: 0,
  details: {
    source: "e214_manifest_query", workflow_state: "CRM-MQ-VALIDATION-FAILED", error_category: "invalid_queue_payload",
    safe_error_summary: "A positive Arrival Notice package quantity is required before a Manifest Query can run.",
    mbl_input: { source: "isf", extraction_method: "staff_entry", staff_confirmed: false },
    manifest_query: { mbl: "ONEYNB6BDAN89800", scac: "ONEY", bill_of_lading_number: "NB6BDAN89800", query_type: "Surface Bill of Lading Status", get_related_house_master_bills: true, ace_query: true },
  },
};

async function mockApi(page: Page, role: "manager" | "vendor", logs: unknown[]) {
  await page.addInitScript((user) => { localStorage.setItem("user", JSON.stringify(user)); localStorage.setItem("access_token", "test-token"); },
    { email: "test@example.com", role, importer_account: role === "vendor" ? "DELT00001" : null, permissions: ["parts", "tally_in"] });
  await page.route("https://api.surfgistics.com/**", async (route) => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    if (path.startsWith("/manager/acelynk-log/") && path.includes("/screenshot")) return route.fulfill({ status: 404, json: { detail: "No screenshot" } });
    if (path === "/manager/acelynk-log") return route.fulfill({ json: logs });
    return route.fulfill({ json: [] });
  });
}

test("Modules page shows why a Manifest Query was rejected before AceLynk", async ({ page }) => {
  await mockApi(page, "manager", [rejectedQueryOnlyJob]);
  await page.goto("/manager/new-items?module=e214_entry_header");
  const row = page.getByRole("row").filter({ hasText: "ONEYNB6BDAN89800" });
  await expect(row.getByText("Needs attention", { exact: true })).toBeVisible();
  await expect(page.getByText("Invalid MBL")).toHaveCount(0);
  await expect(row.getByText("A positive Arrival Notice package quantity is required", { exact: false })).toBeVisible();

  await row.getByRole("button", { name: "View error" }).click();
  await expect(page.getByRole("heading", { name: /Acelynk error/ })).toBeVisible();
  await expect(page.getByText("Validation failed", { exact: true })).toBeVisible();
  await expect(page.getByText("The worker rejected this request before opening AceLynk", { exact: false })).toBeVisible();
  await expect(page.getByText("which is query-only. To create an E214 Header, upload the Arrival Notice", { exact: false })).toBeVisible();
  await page.screenshot({ path: "qa/manager-manifest-validation-failed.png", fullPage: true });
});

test("Manager dashboard lists the worker's reason for a failed job", async ({ page }) => {
  await mockApi(page, "manager", [rejectedQueryOnlyJob]);
  await page.goto("/manager");
  await expect(page.getByText("A positive Arrival Notice package quantity is required", { exact: false })).toBeVisible();
});

test("E214 page warns that the ISF option never creates a Header", async ({ page }) => {
  await mockApi(page, "vendor", []);
  await page.goto("/vendor/e214-manifest-query");
  await page.getByRole("button", { name: /ISF \/ MBL already available/ }).click();
  await expect(page.getByRole("note")).toContainText("never creates an E214 Header");
  await expect(page.getByRole("button", { name: "Queue E214 Manifest Query" })).toBeVisible();
  await page.getByRole("button", { name: /No ISF/ }).click();
  await expect(page.getByRole("note")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create E214 Header" })).toBeVisible();
});
