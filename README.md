# Amal Connect — Operational Prototype (v0.2)

**People. Progress. Opportunity.**

This package upgrades the first visual dashboard into an operational prototype with real user-entered records, a private API starter for document parsing, configurable permitted job feeds, and transparent CV-to-vacancy text comparison. It deliberately does not show invented candidates, vacancies, match scores or source-health badges as live data.

## What works in this version

- Create applicant records from the Applicants page or the **New application** action. Duplicate email addresses are flagged for review. Records persist in the current browser using localStorage.
- Applicant and participant directories start empty; no fictitious applicant records are preloaded.
- Upload PDF, DOCX or legacy DOC CVs to the included Node API. The API extracts selectable PDF text, DOCX text (Mammoth), and DOC text (WordExtractor), returning extracted text and a file hash.
- Search RSS/Atom and JSON job feeds that Amal has permission to consume. Add a source URL, test it, run a keyword/location search, view original listing links and use returned vacancies in matching.
- Use the Government of Newfoundland & Labrador and Government of Canada Job Bank official search pages as external destinations. CareerBeacon and LinkedIn are not scraped; configure only authorised APIs/feeds or employer-provided links.
- Compare an uploaded CV with a retrieved vacancy or pasted job description. The current transparent baseline shows phrase/keyword evidence, requirement group coverage and possible mandatory phrases requiring verification. It is **not** a validated AI model or probability of employment suitability.
- Missing CV evidence is labelled as not evidenced. It is not interpreted as proof that the person lacks the qualification. Staff must verify requirements and approve every referral.

## Important architecture boundary

GitHub Pages is static hosting. It cannot securely run a database, parse documents server-side, hold API credentials, or ingest third-party feeds on its own. This package therefore includes a separate Node API starter. The browser dashboard will not claim that external sources are connected until an API request succeeds.

**Do not use this starter with real participant CVs or sensitive personal information in production yet.** The API starter is intentionally a development scaffold: it has no user authentication, database, private document object storage, role enforcement, rate limiting, malware scanning, OCR, audit trail, or production privacy controls. The CV is processed in memory and the extracted text is returned to the browser; it is not saved by the API. Add authentication, private storage, encryption, access controls, retention/deletion rules, audit logging and security review before operational deployment.

## A. Run the dashboard locally

1. Extract this ZIP.
2. Open PowerShell in the extracted `amal-connect-dashboard` folder.
3. Run `python -m http.server 8000`.
4. Visit `http://localhost:8000`.
5. Applicant records are stored in that browser only. Different staff/computers do not share records.

## B. Run the CV and job-feed API locally

Install Node.js 20 or later. In a second PowerShell window, from this folder:

```powershell
npm install
Copy-Item .env.example .env
npm start
```

The API listens at `http://localhost:8787`. Test it by opening `http://localhost:8787/api/health`.

In Amal Connect, open **Job Discovery → API settings**, enter `http://localhost:8787`, save, then reload the dashboard. The same API setting is used by CV upload and feed search.

### Document support

- `.pdf`: searchable/selectable text PDFs. Scanned image-only PDFs return a clear error; OCR is not included.
- `.docx`: Word Open XML documents.
- `.doc`: legacy Word binary documents.
- Maximum upload size is 12 MB. Password-protected, damaged, or unsupported files may fail.

## C. Configure an approved job feed

Open **Job Discovery → Configure source**. Add an RSS/Atom feed or JSON feed URL that Amal is authorised to consume. Enter the source name, URL and permission notes. Use **Test** before searching.

The API normalises feed items, filters by query/location/type, deduplicates by listing URL and returns the original listing URL. It reports feed errors rather than inventing vacancies.

No automated connector is preconfigured for Job Bank, CareerBeacon or LinkedIn. The public Job Bank site does not provide a self-serve general search API for this package; an approved data partner/API or a permitted feed is required for automated ingestion. CareerBeacon terms restrict harvesting/copying and LinkedIn requires approved access. Do not scrape either site. Government of NL public vacancy listings can be searched directly at https://www.hiring.gov.nl.ca/Competitions/Public; automated ingestion still requires an approved feed/API or written permission.

## D. Deploy

### Frontend

Upload the contents of this folder to a GitHub repository and enable GitHub Pages from `main` / root. Keep `api-server.js`, `package.json` and backend files in the repository only as source code; GitHub Pages will not execute them.

### Backend

Deploy the Node API to a trusted private Node host. Set `PORT` (if required) and `ALLOWED_ORIGINS` to the exact GitHub Pages URL. Then set the deployed API URL in **Job Discovery → API settings**. Never place API keys or secrets in frontend JavaScript or a public repository. Use HTTPS.

## Next production requirements

1. PostgreSQL database and authenticated staff/participant accounts with role-based access.
2. Private encrypted object storage for original CVs, consent documents and certificates; malware scanning and access logs.
3. Persisted participant/CV versions, consent, training verification, activation outcomes, referrals and employment retention.
4. Approved, contractually permitted job-source integrations and scheduled ingestion with source provenance, expiry, deduplication and retrieval logs.
5. Robust CV extraction pipeline, OCR for scanned documents, multilingual handling, extraction quality checks and page/section evidence coordinates.
6. Validated explainable matching model with mandatory requirement gates, human review and bias/fairness assessment. Do not use a raw keyword overlap score as an AI suitability score.
7. Email delivery, notifications, audit trails, backups, monitoring and Canadian privacy/security review.

## Official links

- Amal Unite & Empower: https://amalue.ca/
- Government of NL public opportunities: https://www.hiring.gov.nl.ca/Competitions/Public
- Government of Canada Job Bank: https://www.jobbank.gc.ca/jobsearch/
- CareerBeacon terms: https://www.careerbeacon.com/en/terms-of-service
