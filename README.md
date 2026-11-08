# Amal Connect

Employment management platform for the Amal Employment Network: applications, information sessions, consent, training, activation, CV reading, job discovery, requirement-level matching, staff-approved referrals, and employment outcomes.

No sample people, jobs or figures are included. Everything on screen comes from records you create or sources you connect.

## Run it on your computer

Install [Node.js 22 LTS](https://nodejs.org). In PowerShell, inside this folder:

```powershell
npm install
npm start
```

Open http://localhost:8787 and create the first Super Administrator. There is only one window and one address. Job discovery starts by itself.

## Put it online

GitHub stores the code. GitHub Pages only serves static files, so it cannot read CVs, hold a database or keep API keys safe. Use a host that runs Node.

**Render, from your GitHub repository**

1. Upload the contents of this folder to a **private** GitHub repository. Do not upload `node_modules`, `data` or `.env`.
2. In Render choose **New → Blueprint** and select the repository. `render.yaml` sets everything up, including a persistent disk.
3. Set `PUBLIC_URL` to the address Render gives you. Add SMTP values to send email.

The Blueprint uses a paid instance because Render's free instances erase local files on every restart and cannot attach a disk.

To keep the website on GitHub Pages as well, publish from the `/docs` folder, put the server address in `docs/config.js`, and list the Pages address in `ALLOWED_ORIGINS`.

## Connect job sources

Open **Job Discovery → Connect source**. Each source is tested when saved, and any failure shows the provider's actual error.

| Source | Type | How to get access | What you get |
|---|---|---|---|
| Job Bank Open Data | Government open data | Already connected | NL postings, updated monthly. Some may have closed. |
| Adzuna Canada | Official API | Free key at developer.adzuna.com | Same-day listings. Excerpts only. Shows "Jobs by Adzuna". Commercial, government and academic users get a trial period, so ask Adzuna about a licence for ongoing use. |
| Jooble | Official API | Request a key at jooble.org/api/about | Listings. Excerpts only. |
| Greenhouse, Lever, Ashby, SmartRecruiters | Employer job boards | No key. Enter the employer's board name. | That employer's full adverts. |
| RSS, Atom, XML, JSON | Feeds | The address from the provider | Any feed you are permitted to use. |
| Job Bank XML feed | Government feed | Apply at jobbank.gc.ca/survey/14. Requirements include a Canadian Business Number and an established employment website. | Full national feed if approved. Add it as an XML source. |
| Job Bank widget | Official embed | Already on the Job Discovery page | Live search inside the widget. Free for non-commercial use. |
| Any employer page | Structured data | **Import from link** | One posting, if the page publishes job data and allows automated reading. |
| Government of NL, or an employer without a feed | Paste | **Add a vacancy** | Full requirement-level matching. Ask the Public Service Commission or employer if they will provide a feed. |

Not connected automatically, because no permitted self-serve route exists: LinkedIn, Indeed, CareerBeacon. Do not use third-party scrapers for them or for Job Bank.

## CV reading

The file's real content decides how it is read, so a wrongly named file still works. Supported: PDF, scanned PDF (OCR, first 10 pages), DOCX, DOC, RTF, TXT, Word-as-HTML, and photos (JPG, PNG). Limit 15 MB. Password-protected or corrupt files get a specific message.

## How matching works

It is an explainable rules engine that runs entirely on your server; no CV is sent to an outside service. Each requirement is taken from the advert, categorised, marked mandatory or preferred, and compared with the CV, showing the evidence with page and section. Add terms in `server/lexicon.js`. Weights are set under **Settings**.

## Before using real participant data

Have these reviewed: Canadian privacy compliance including a retention period, your consent wording, HTTPS and backups of `DATA_DIR`, virus scanning of uploads, and the matching rules for fairness. Replace the placeholder logo in `docs/` with Amal's official artwork.
