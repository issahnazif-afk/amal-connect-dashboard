# Amal Connect (GitHub Pages edition)

Runs entirely on GitHub Pages. CV reading, matching and all records run in the visitor's browser. A scheduled GitHub job collects vacancies into `data/jobs.json`.

## Publish
1. In your repository choose **Add file → Upload files**, and upload everything in this folder, including `.github`.
2. **Settings → Pages**: deploy from `main`, folder `/ (root)`.
3. **Actions → Collect jobs**: confirm it ran, or press **Run workflow**. Allow it about two minutes.
4. Open the site, create the administrator, and go to Job Discovery.

## Add live vacancies
Repository **Settings → Secrets and variables → Actions → New repository secret**:
- `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` (free at developer.adzuna.com)
- `JOOBLE_API_KEY` (optional, request at jooble.org/api/about)

To add an employer's job board, add a line to `ingest/sources.json`, for example:
`{"name":"Employer name","kind":"greenhouse","config":{"board":"boardname","employer":"Employer name"}}`
Kinds: `greenhouse`, `lever`, `ashby`, `smartrecruiters`, `rss`, `json`.

## Limits of this edition
- Records stay in the browser where they were entered. Use Settings → Download backup to move them to another laptop.
- Email opens in your own mail app with "Open in email".
- Use test CVs for the pitch. Real participant data needs the server edition.
