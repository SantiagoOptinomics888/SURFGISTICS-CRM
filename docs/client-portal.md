# Client shipment portal

The CRM now includes `/client` (shipment list, documents, activity) and `/client/new` (ISF intake and review). These pages use the existing shipment API and importer accounts; no schema migration is needed.

## Give a client access

1. Open **User Access** as an administrator and create or edit a user.
2. Use the **Vendor** role, assign the client's importer account, and select **Use client portal access**. This sets module permissions to **Imports** only.
3. Save the account and provide the CRM sign-in URL and credentials through your usual account-onboarding process.

Users with only Imports permission open directly in the client portal after signing in. Vendors with additional modules keep their existing workspace and get a Client portal navigation link. Users sharing an importer account share that account's shipment records. Use different importer accounts for separate clients.

The portal requires an authenticated account with Imports access. Server-side checks enforce importer-account isolation for list, upload, and download operations. Clients cannot approve classifications or mark ISF processing complete. Disabled accounts cannot sign in.

## Client workflow

- Select **Start a shipment** and drop in the ISF (required). The commercial invoice, packing list, and arrival notice can be dropped on the same screen or added later. There are no form fields: the backend reads the HBL, contact, and delivery address from the ISF, and the MBL, containers, and package quantity for the E214 header from the arrival notice.
- Submitting creates the shipment from the ISF, queues the existing AceLynk and GoFreight jobs, then attaches any other documents that were dropped.
- On an existing shipment, a file dropped or picked for a checklist item uploads immediately, with no confirmation step. Each upload is stored on the shipment and creates an activity entry visible to operations.
- Clients see plain-language progress (ISF filing, goods & packing details, entry header). Internal system names and review states stay on the operations side.
- Search by HBL, review outstanding documents and status, and download previously uploaded files.
- Operations continues to manage shipments under **ISF & Shipments**. Requests for delivery corrections go to the operations team.

ISF and structured supporting uploads accept PDF, TXT, CSV, and XLSX files up to 15 MB. Other attachments additionally accept common image, Word, and XLS files. The backend remains authoritative for file size and extraction validation. Arrival notices that need interpretation remain available for staff review. Document follow-up dates are displayed as follow-up dates, not promised delivery dates.

## Validation and release

- `npm run build -- --webpack`
- `npx playwright test -c playwright.client.config.ts` (mocked API data, no production writes)
- API regression suite in the sibling Surfgistics repository: `python -m pytest tests/test_client_portal.py tests/test_shipments.py tests/test_auth.py tests/test_arrival_notice_extraction.py tests/test_e214_manifest_query.py -q`

The client browser test configuration starts a localhost preview on port 3094. Screenshots in `qa/client-portal-*.png` and `qa/client-shipment-review.png` use fictional test account data.

Deploy the CRM frontend and the accompanying Surfgistics API changes together. Keep the production API URL configured through `NEXT_PUBLIC_API_URL`. This feature adds no accounts automatically, sends no invitation emails, and does not deploy itself.
