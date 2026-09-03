# Atlas · Market Intelligence

A static, interactive leadership dashboard for 14 markets. React + Vite + Recharts, deployed through GitHub Actions to GitHub Pages. **No Sites services, application server, runtime API, database, analytics tracking, or external font/CDN dependencies.**

**[Open Atlas Executive](https://anoj-ghub.github.io/txn-dashboard/)**

Atlas Executive is the repository’s only dashboard and opens at the root URL. The former dashboard and its source entry have been removed. The existing `/executive.html` address remains as an alias for previously shared links.

The dashboard uses larger typography and a premium blue theme, monthly transaction bars with a descriptive fitted trendline, an active-plastic market-share donut, ranked horizontal bars for active basic, and an active-account area/trend chart. Market comparison switches transaction bars into market stacks; donut legends, ranking labels, and the market scorecard drill into a selection. Every chart follows the selected markets, timeframe, and comparison mode. Definitions, filtered CSV export, shareable links, and a printable brief are included.

**Compare [year] with** offers **Months within [year]**, the previous year, any other available year, or **All previous years**. The monthly option switches the entire dashboard to the selected year: KPI cards, readout, and scorecard show first-to-last reported-month change; year overlays disappear; the time-detail panel shows monthly values; and the combined chart shows each month’s change from its immediate predecessor. Year modes use the reporting year's selected months and markets. All previous years means each year from 2019 through the year before the reporting year, shown separately in historical bars, chart overlays, combined growth bars, and an expandable four-metric table. KPI cards and the scorecard show the minimum-to-maximum percentage change across available baselines, never a historical average. Missing or zero baselines are marked unavailable. Changes spanning multiple years are cumulative, not annualized.

The executive readout includes a separate point for each of the four metrics, with its value, comparison change, and strongest market change (single baseline) or the count of higher/lower/unchanged comparisons (all previous years). Transactions use period totals; the other three metrics use the last selected month's balance. Share links preserve the comparison choice, and **Export CSV** includes the reporting and comparison years for the selected markets and months. Indexed trends, the market-share donut, and active-basic rankings describe the reporting year; use the historical metric tabs to compare card/account balances across years.

Month selectors include **January through December** in every year. For the latest year, a partial-year banner states the dataset cutoff. When `partialCurrentMonth` is true, the latest month is marked as partial in the page status, banner, chart labels, tooltips, KPI cards, and monthly table. When the selected range extends beyond that cutoff, KPI totals and year-wise comparison summaries use only the reported portion of the selection, matched to the same months in every baseline year; balances use the last reported month in that range. Selecting only unreported months produces unavailable values. Missing records within the reported period still suppress incomplete aggregates. Monthly charts retain the full selected range, with unreported months shown as gaps.

Select **Months within [year]** in the main comparison dropdown to see chronological monthly bars and a table of all four metrics. Each metric has its own chart tab, and future months are labelled **Not yet reported**. Month range and market filters apply across the dashboard, and shared links preserve the comparison mode.

The transaction trendline is an ordinary least-squares fit within the observed period, not a forecast. It is omitted for fewer than two months or an incomplete selected period. The donut groups smaller markets into a labelled “Other markets” slice without dropping their values from the denominator.

## What is included

- Portfolio overview, individual-market drilldown, and multi-market comparison.
- Year and start/end month filters; shareable links preserve these selections.
- Four KPI cards and individual charts for transactions, active plastic, active basic, and active accounts.
- A combined view with indexed growth (first month = 100), actual values, and interactive metric legends.
- Matched prior-year overlays, market distribution charts, sortable market rankings, and calculated executive signals.
- Local CSV preview, complete/filtered CSV download, and a print layout: **Export report → Save as PDF** in your browser.
- Responsive layout, keyboard-operable controls, chart tooltips, and explicit loading, invalid-data, missing-data, and empty-selection states.
- A repeatable synthetic dataset: **1,302 rows, 14 markets × 93 months, January 2019–September 2026**. Later regeneration extends through the current month. All numbers are illustrative; the latest current-month observation is explicitly reported as partial.

## Run locally

Use Node.js 24 LTS.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Do not open `index.html` directly from the filesystem: browsers restrict the CSV fetch under `file://`.

```sh
npm test
npm run build
npm run preview
```

Only `dist/` is published. The build includes all scripts, charts, fonts, CSV data, and metadata. Relative asset/data URLs support both `/txn-dashboard/` and a custom domain. Views use query parameters, so GitHub Pages does not need SPA route rewrites.

## Enable GitHub Pages once

1. In this repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
2. Push to `main` or manually run **Actions → Validate and publish dashboard → Run workflow**.
3. The workflow validates the CSV, tests the calculations, builds the static website, and deploys it. Its deployment environment links to the live page.

Pull requests run tests and build without deploying. Pushes to `main` affecting application/data/workflow files publish automatically. Invalid CSV data stops the release before the deployment step, preserving the last successful website. The Actions run summary includes the latest reporting period and headline changes.

## CSV contract

Use UTF-8 with this header. A BOM, CRLF, and quoted text fields are supported.

```csv
Market-id,Market-name,Year,Month,Txn-count,Total Active Plastic,Total Active Basic,Active Accounts
US,United States,2026,9,12500000,3400000,2800000,2600000
```

| Field | Rule |
| --- | --- |
| Market-id | Two letters/digits, normalized to uppercase; stable across history |
| Market-name | Consistent name for the ID; at most 100 characters |
| Year | Integer, 2019 onwards; no future reporting periods |
| Month | Integer 1–12 |
| Four metric fields | Non-negative whole-number counts, no thousands separators, currency symbols, or M/K suffixes |

There must be exactly one row per market/year/month. Publication requires **exactly 14 markets and complete history from January 2019 through the latest month for every market**. Duplicate keys, inconsistent market names, malformed CSV, invalid numbers, and missing observations fail validation. A zero is a real observation and is not equivalent to missing data.

The browser can preview smaller or incomplete datasets, displays a coverage warning, and suppresses partial aggregates. A preview is held in memory in that browser session only; it does not write to the repository, upload the file, or become part of a shared link.

## Calculation rules

| Measure | Selected period KPI / market table | Trend chart |
| --- | --- | --- |
| Transactions | Sum of all selected months and markets | Total for each individual month |
| Active plastic | Last selected month's snapshot across selected markets | Each month's snapshot |
| Active basic | Last selected month's snapshot across selected markets | Each month's snapshot |
| Active accounts | Last selected month's snapshot across selected markets | Each month's snapshot |

Year-over-year is `(current / prior - 1) × 100`, using the same months and market selection in the prior year. A zero/missing prior value yields unavailable growth, not infinity. The first year of history has no prior-year comparison. Period transaction totals require all selected observations; stock totals require all selected markets in the final month. Individual incomplete chart months are gaps.

Within-year KPI, readout, and scorecard change is `(last reported month / first reported month - 1) × 100`. It requires two distinct, complete reported months. The combined monthly-change chart compares each reported month with its immediate predecessor. Transaction KPI values remain selected-period totals; transaction change in within-year mode compares monthly volumes so it is not distorted by summing different numbers of months.

Indexed values are `monthly value / first selected month's value × 100`; a zero/missing baseline cannot be indexed. Transactions per account uses **the last selected month's transactions / that month's active accounts**, not YTD transactions divided by a monthly balance. Signals describe measured changes; they do not infer business causes or claim statistical significance. Portfolio account totals assume market populations are additive; the file cannot deduplicate people who hold accounts in multiple markets. Confirm the mainframe's precise definitions of “plastic,” “basic,” “active,” reporting cutoff, and market assignment before business use.

## Monthly mainframe-to-dashboard process

The download and conversion from the mainframe remains a separate process. Produce the CSV in the format above on an approved workstation or runner; no mainframe credentials belong in this app.

### First production load

Replace the synthetic dataset with a **complete historical extract**. Never combine real monthly records with the demo's invented history.

```sh
npm run ingest:data -- path/to/full-history.csv --replace-history
npm test
npm run build
git add public/data/markets.csv public/data/metadata.json
git commit -m "Load production market history"
git push origin main
```

The import utility validates the whole result before modifying files. It sets `metadata.kind` to `production`, updates the latest period, and changes the dashboard's demo badge. Production counts must be approved for public publication before pushing.

### Later monthly loads or corrections

```sh
npm run ingest:data -- path/to/monthly-export.csv
npm run build
git add public/data/markets.csv public/data/metadata.json
git commit -m "Update monthly market reporting"
git push origin main
```

This merges by market/year/month and replaces matching records for corrections. It checks the resulting archive for all 14 markets and missing months before writing. A partial current month can be published when all 14 markets are present and `partialCurrentMonth` is `true` in `metadata.json`; the dashboard labels it throughout. Existing months can receive targeted corrections. Renamed markets require a consistent historical update. Review the diff and commit the CSV and metadata together.

Alternatively replace the complete `public/data/markets.csv` in GitHub's web editor and update `public/data/metadata.json` with the same latest period in `YYYY-MM` form. Set `kind` to `production` for actual data, and provide an appropriate `title` and `note`. The two files must be committed together to pass validation.

### Regenerate sample data

```sh
npm run generate:data
# Or reproduce this delivery's reporting window:
npm run generate:data -- --through=2026-09
```

This intentionally replaces both published data files with deterministic sample values. It is a development/demo operation, never a step in the publishing workflow. Commit timestamps in metadata will vary; the sample observations themselves are repeatable.

## Optional update email

Email is **disabled by default**. No mail has been sent by this implementation. Enable it only after selecting recipients and configuring an approved SMTP service.

Under **Settings → Secrets and variables → Actions**, create these **repository secrets**:

| Secret | Purpose |
| --- | --- |
| `SMTP_HOST` | Mail provider SMTP hostname |
| `SMTP_PORT` | `587` for STARTTLS (default), or `465` for implicit TLS |
| `SMTP_USER` | SMTP login |
| `SMTP_PASSWORD` | SMTP password or provider app password |
| `EMAIL_FROM` | Approved sender address |
| `EMAIL_TO` | Comma-separated recipient addresses |

Then set the **repository variable** `EMAIL_ENABLED` to `true`. Disable it by removing the variable or setting it to `false`. Credentials and recipients stay out of the static build. `scripts/notify.py` uses encrypted SMTP from the Actions runner after a successful deployment and includes the reporting period, YTD transactions and YoY, latest account/card balances, and the actual deployed page URL. Recipients are sent via the SMTP envelope rather than a public recipient list. An email failure does not undo a successful deployment; it does make the notification job fail visibly. Every successful publishing run sends an update while enabled, including manual reruns and code-only deployments; it is not a deduplicated monthly mailing system.

## Easy alternatives within GitHub Pages

| Approach | When to use it | Tradeoff |
| --- | --- | --- |
| Replace historical CSV + metadata in GitHub, let Actions publish | Simplest monthly routine | One manual file update |
| External scheduled export commits the two data files | Repeatable mainframe export is available | Needs an approved GitHub App or scoped credential on the export machine |
| Scheduled Actions job downloads a CSV from an approved HTTPS source | File is already on an accessible endpoint | Requires source credentials and scheduling; avoid direct mainframe exposure |
| Publish prebuilt `dist/` from a `gh-pages` branch | Organization prefers branch publishing | Must rebuild outside Pages and copy the output; changing source CSV alone is insufficient |
| Host an immutable/versioned CSV on public object storage | Data changes independently of UI releases | Requires CORS, a public-safe dataset, and a small change to the CSV URL/configuration |

If a separate GitHub workflow commits data with the default `GITHUB_TOKEN`, that push normally does **not** trigger another workflow. Use a scoped GitHub App token or explicitly dispatch this deployment workflow after the commit. The mainframe conversion job is intentionally not configured because the export format, access method, and scheduling environment have not been supplied.

**Public visibility matters:** this repository is public, and public Pages assets—including CSV files—are downloadable by visitors. A private source repository alone does not necessarily make its Pages site private. GitHub Enterprise Cloud can support access-controlled project sites in eligible configurations. For confidential leadership data, confirm an approved private hosting/access arrangement before loading real figures; a client-side password prompt cannot protect a publicly served CSV.

## Project map

```text
src/Executive.jsx           Dashboard and local interaction state
src/ExecutiveComparison.jsx Time-comparison views and readouts
src/executive-data.mjs      Executive comparison calculations
src/data.mjs                Shared parsing and metric calculations
src/executive.css           Blue theme, responsive layout, and print styles
public/data/markets.csv     Published historical dataset
public/data/metadata.json   Dataset type and reporting period
scripts/generate-data.mjs   Deterministic sample generator
scripts/ingest-month.mjs    Standalone CSV merge/replacement utility
scripts/validate-data.mjs   Publication data quality gate
scripts/notify.py           Optional SMTP release notification
tests/data.test.mjs         Aggregation and validation regression tests
.github/workflows/pages.yml Static build, deployment, optional notification
```

## GitHub references

- [Custom GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Configure a Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Events triggered by GITHUB_TOKEN](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow)
- [Control access to a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site)
