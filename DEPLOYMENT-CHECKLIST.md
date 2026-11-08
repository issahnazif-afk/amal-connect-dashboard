# Amal Connect v0.2 deployment checklist

## Local validation
- [ ] Extract ZIP.
- [ ] Run `python -m http.server 8000` and open http://localhost:8000.
- [ ] Confirm Applicants starts empty.
- [ ] Create an applicant; refresh and confirm it remains in the same browser.
- [ ] Run API: `npm install`, `npm start`.
- [ ] Open `/api/health` and confirm `ok: true`.
- [ ] Set API URL in Job Discovery → API settings; reload.
- [ ] Test one authorised RSS/Atom or JSON feed.
- [ ] Test a selectable-text PDF, DOCX and DOC CV; verify extraction output.
- [ ] Test a scanned PDF and confirm it reports OCR is not available.
- [ ] Compare an uploaded CV with a real vacancy description and review evidence labels.

## GitHub Pages frontend
- [ ] Upload the project contents with `index.html` at repository root.
- [ ] Enable Pages on `main` / root.
- [ ] Do not upload participant records, CVs, secrets, `.env` or production data.

## Private API host
- [ ] Deploy the Node API to a trusted private host with HTTPS.
- [ ] Set `ALLOWED_ORIGINS` to the exact frontend origin.
- [ ] Set API URL in the dashboard and reload.
- [ ] Add authentication, database, secure object storage, rate limits, audit logs and security review before real data.
