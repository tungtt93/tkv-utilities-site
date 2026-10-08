# TKV Utilities — landing page

Static site (HTML/CSS/JS, no build step). Source lives in this folder inside the private app repo; GitHub Actions publishes it to the public Pages repo `[tungtt93/tkv-utilities-site](https://github.com/tungtt93/tkv-utilities-site)`.

Live URL (after Pages is enabled): [https://tungtt93.github.io/tkv-utilities-site/](https://tungtt93.github.io/tkv-utilities-site/)

## Local preview

`fetch('releases.json')` needs an HTTP server (not `file://`):

```bash
npx --yes serve site
```

Open the printed URL. Toggle VI/EN, light/dark (OS setting), and check that download cards hide when a `url` in `releases.json` is empty.

## Publish a release

Release files are hosted as GitHub Release assets in the public landing repository. The checked-in
`[releases.json](releases.json)` is only a no-download fallback; the release workflow generates and
deploys the real manifest after verifying every checksum.

1. Update the version in `package.json`, the workspace `Cargo.toml`, and
  `src-tauri/tauri.conf.json`, then merge that commit to `main`.
2. Create and push the matching tag:
  ```bash
   git tag v0.2.0
   git push origin v0.2.0
  ```
3. **Build and publish release** builds on Windows and macOS, verifies the artifact checksums,
  uploads them to a draft release, publishes it, and deploys the landing page.

`pnpm release` remains useful for a local test package, but it does not publish anything.
To retry a failed publication, rerun the failed workflow jobs; asset upload is idempotent.
To roll back the landing download links, mark an older release as latest and manually run
**Deploy landing page**.

## One-time GitHub Pages setup

1. Create a **public** repository `tungtt93/tkv-utilities-site` (empty is fine).
2. Generate a deploy key pair (do not reuse your personal SSH key):
  ```bash
   ssh-keygen -t ed25519 -C "tkv-site-deploy" -f tkv-site-deploy -N ""
  ```
3. In **tkv-utilities-site** → Settings → Deploy keys → Add deploy key: paste `tkv-site-deploy.pub`, enable **Allow write access**.
4. In **this private repo** (`tkv-utilities`) → Settings → Secrets and variables → Actions, add:
  - Name: `SITE_DEPLOY_KEY`
  - Value: contents of `tkv-site-deploy` (private key)
  - Name: `LANDING_REPO_TOKEN`
  - Value: a fine-grained personal access token scoped only to `tungtt93/tkv-utilities-site`
  with **Contents: Read and write** (needed to create GitHub Releases).
5. In **tkv-utilities-site** → Settings → Pages → Source: **Deploy from a branch** → Branch `main` / `/ (root)`.
6. Delete the local key files after saving the secret. Trigger **Deploy landing page** via Actions → Run workflow, or push a change under `site/`.

Optional custom domain: add a `CNAME` file in this folder and configure DNS + Pages custom domain on the public repo.

## Localized images

Marketing art lives in `assets/images/`. App screenshots for the coverflow slider live in `assets/screenshots/`. Vietnamese is the base filename; English adds `_en` before the extension (falls back to the VI file if `_en` is missing):


| VI                              | EN                              |
| ------------------------------- | ------------------------------- |
| `images/01_hero_laptop.png`     | `images/01_hero_laptop.png`     |
| `images/03_download_laptop.png` | `images/03_download_laptop.png` |


`main.js` swaps `src` from `data-i18n-img` when the language toggle changes. Missing English
assets fall back to Vietnamese. The showcase is a coverflow slider controlled by clicking a side
slide, dragging/swiping, keyboard arrows, or dots.

## Files


| Path                         | Role                                    |
| ---------------------------- | --------------------------------------- |
| `index.html`                 | Single-page landing                     |
| `styles.css`                 | Light/dark via `prefers-color-scheme`   |
| `i18n.js` / `main.js`        | VI/EN strings, OS hint, releases loader |
| `releases.json`              | Manual download URLs + SHA-256          |
| `assets/`                    | Logo, favicon, OG image, screenshots    |
| `robots.txt` / `sitemap.xml` | SEO                                     |


