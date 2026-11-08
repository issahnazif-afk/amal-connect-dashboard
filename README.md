# Amal Connect — Dashboard Prototype

**People. Progress. Opportunity.**

A responsive, interactive front-end prototype for the Amal Unite & Empower employment programme in Newfoundland and Labrador.

## What is included

- Executive dashboard with participant journey, outcomes, staff action queue and conceptual NL job-market visual.
- Applicant and participant directories with search and status filters.
- Information-session scheduling overview.
- Consent and enrolment workflow overview.
- Configurable three-programme training pathway and mandatory Activation Session gate.
- Employment Ready pool view.
- Job discovery centre and source-monitoring placeholders.
- Talent intelligence workspace with requirement-by-requirement evidence categories.
- Referral approval centre with approve / request information / decline actions.
- Employer directory, outcomes and retention, communications, reports, settings and staff-role views.
- Participant portal preview.
- CSV exports and local demo record creation.

## Important prototype limitations

This is a **front-end demonstration**, not a production employment case-management system.

- All names, metrics, vacancies, scores, and outcomes are fictional sample data.
- Actions and newly created records exist only in the current browser session; there is no database.
- No real login, role enforcement, email sending, document upload/storage, external job ingestion, AI extraction or matching service is connected.
- The logo in this prototype is a temporary CSS interpretation of the Amal mark. Replace it with the approved official vector/logo asset before production.
- The Newfoundland and Labrador map visual is conceptual, not a geographic GIS map.
- Do not enter real participant information or upload real CVs into this prototype.
- Do not scrape job sites without checking their terms, robots policies and approved API/access methods. LinkedIn requires permitted access.

## Run locally

No installation or API key is required.

1. Unzip the downloaded project.
2. Open the `amal-connect-dashboard` folder.
3. Double-click `index.html` to open it in a modern browser.

For a local development server, open PowerShell in the folder and run:

```powershell
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Publish using GitHub Pages

1. Create a new **public** GitHub repository, for example `amal-connect-dashboard`.
2. Unzip this package on your computer.
3. Open the extracted `amal-connect-dashboard` folder. You should see `index.html`, `styles.css`, `app.js` and this README.
4. In the new GitHub repository choose **Add file → Upload files**.
5. Upload the *contents* of the extracted folder (not an extra nested folder).
6. Commit the files to the `main` branch.
7. In GitHub, open **Settings → Pages**.
8. Under **Build and deployment**, choose **Deploy from a branch**.
9. Select branch `main` and folder `/ (root)`, then click **Save**.
10. Wait for the Pages deployment to finish. GitHub will display the public website URL in the Pages section.

## Suggested production architecture

The next implementation phase should add:

- Next.js / TypeScript application and PostgreSQL database.
- Authentication with MFA and role-based authorization.
- Private object storage for CVs, signed consent and certificates.
- Immutable audit history for sensitive actions and referral approvals.
- Consent versioning, withdrawal and retention/deletion policy.
- Three-programme pathway configuration, completion verification and activation approval.
- Job ingestion through approved APIs, feeds or employer integrations, with source provenance and deduplication.
- CV parsing and explainable matching service with mandatory requirement gates and human review.
- Email/in-app notification provider and editable templates.
- Canadian privacy and security review, accessibility validation and operational monitoring.

## Amal branding

The official Amal website is https://amalue.ca/. Replace the temporary CSS logo with the approved official logo file supplied by Amal. The prototype uses the approved light enterprise visual direction: navy, teal, warm gold and coral.
