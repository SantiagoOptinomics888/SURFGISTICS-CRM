import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e", testMatch: ["client-portal.spec.ts", "shipment-lifecycle.spec.ts", "manifest-query-status.spec.ts"], fullyParallel: false, workers: 1,
  timeout: 45000, use: { baseURL: "http://127.0.0.1:3094", trace: "retain-on-failure" },
  webServer: {
    command: process.env.PLAYWRIGHT_USE_BUILD ? "npm run start -- --hostname 127.0.0.1 --port 3094" : "npm run dev -- --webpack --hostname 127.0.0.1 --port 3094",
    url: "http://127.0.0.1:3094", reuseExistingServer: false,
    env: { NEXT_PUBLIC_API_URL: "https://api.surfgistics.com" }, timeout: 60000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
