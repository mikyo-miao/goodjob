---
name: cg-import
description: Build, clean, audit, and semantically route hosted CG libraries for Fengyue (风月) exported role-card JSON and RiliAIChat cards. Use when mapping local images to direct links or CSS classes, deleting stale image references, matching each CG by visual content, creating low-token world-book catalogs and prompt routers, isolating status-bar images from story CG, or maintaining RiliAIChat status flip-card/editor mappings.
---

# CG Import And Semantic Routing

Use this skill to maintain pre-hosted CG libraries without changing unrelated role-card behavior. Treat Fengyue exported JSON and RiliAIChat workshop cards as separate platforms even when they share the same CSS-background technique.

## Select The Platform First

Do not assume RiliAIChat merely because this skill originally targeted it.

| Evidence | Route |
|---|---|
| A local/exported JSON containing `world_book`, `builtInCss`, `pre_prompt`, or `post_text` | Fengyue JSON |
| The user says 风月网站、风月角色卡、导出卡、世界书 | Fengyue JSON |
| An open RiliAIChat workshop/editor, custom-style textarea, follow-up prompt, or interactive status flip card | RiliAIChat |

If evidence conflicts, inspect the artifact before editing. For Fengyue, edit the JSON file directly with Python; do not use browser automation by default. For RiliAIChat, use the workshop/browser workflow below.

## Shared Rendering Pattern

Both platforms commonly render a hosted library through CSS:

```css
.story-image.img-SY-CF01 {
  background-image: url("https://host.example/path/image.webp");
}
```

The model emits only the mapped placeholder:

```html
<div class="story-image img-SY-CF01"></div>
```

Keep direct URLs in CSS, not in normal model output. Preserve the card's existing wrapper and naming convention instead of forcing the example prefix.

## Fengyue JSON Route

Read [references/fengyue-json-workflow.md](references/fengyue-json-workflow.md) completely before changing a Fengyue card. It defines:

- safe backup, parsing, and field-boundary rules;
- exact-basename and SHA-256 link reconciliation;
- deleted-file cleanup across CSS, world book, and prompt whitelists;
- contact-sheet and metadata-assisted inspection of every image;
- per-image semantic catalogs with actual pixels taking precedence over filenames/folders;
- low-token, safety-aware best-match routing with constrained random fallback;
- status/story isolation and before/after validation.

Do not modify `description`, `opening_statement`, character prose, UI, or unrelated fields unless the user explicitly requests it. Preserve the target card's existing number, placement, and exception rules for images; learn them from the card rather than hardcoding a prior card's values.

## RiliAIChat Route

### Inspect Existing Output

- Use the browser skill for an open RiliAIChat workshop or preview.
- Inspect visible `img` elements, computed `background-image`, message HTML, and patterns such as `.story-image`, `.img-XXX-01`, `<audio>`, `<details>`, and status panels.
- A `div.story-image img-XA-01` plus CSS `background-image` indicates a pre-hosted library with model-selected IDs.
- A folded `<details>` planning block is not truly hidden. Keep planning in prompts and forbid draft notes in final output.

### Host Images

Canonical hosting repo (use this repo for all uploads unless the user says otherwise):

```text
https://github.com/mikyo-miao/goodjob.git
```

`--repo` is `mikyo-miao/goodjob`, branch `main`, public (raw links work unauthenticated).

**Each card gets its own independent folder.** One card = one folder named after the card's slug: `assets/<card-slug>/`. Never mix files from two cards in the same folder; status assets nest inside the card folder (`assets/<card-slug>/status/...`). Derive the slug from the card name (pinyin or established convention), confirm with the user if ambiguous, and check `assets/` on the remote first to avoid reusing or colliding with an existing card's folder.

Store assets at a stable simple path and use a raw public URL:

```text
https://raw.githubusercontent.com/mikyo-miao/goodjob/main/assets/<card-slug>/1.webp
```

### Credentials (new account `mikyo-miao`)

The upload script queries `git credential fill` with the repo owner as username, so multiple GitHub accounts coexist in the credential store. One-time setup for a new account:

1. User creates a Personal Access Token (fine-grained: Repository access → only `goodjob`; Permissions → Contents: Read and write. Or classic with `repo` scope).
2. Store it without echoing: `printf 'protocol=https\nhost=github.com\nusername=mikyo-miao\npassword=<TOKEN>\n' | git credential approve`.
3. Sanity-check with a 1-file test upload before batch uploads; a 401/403/404 on PUT means the token belongs to the wrong account or lacks Contents write.

Never print the token; `git credential approve` input is not logged. The old `xiwangliu36-arch` credential stays usable for that account's repos.

Never upload, publish, commit, or push private images without explicit user consent. If Git cannot connect while the browser can, inspect proxy settings and, only when appropriate, configure the same repository-local proxy.

#### Git network failures on this machine (known 2026-08 case)

Observed on the `mikyo` hosting repo (`C:\Users\ZhuanZ（无密码）\Documents\风月\github-upload\mikyo-repo`):

1. **Dead repo-local proxy blocks push.** The repo carried `http.proxy` / `https.proxy = http://127.0.0.1:7890` pointing at a port that no longer listens. Symptom: `push` fails with `Failed to connect to github.com port 443 via 127.0.0.1`. Fix: remove the stale entries — `git config --local --unset http.proxy` and `--unset https.proxy` (direct connection to github.com works). Always check `git config --local --list | grep -i proxy` first.
2. **Smart-HTTP fetch/pull is unreliable on this connection.** `git fetch` dies mid-transfer with `curl 56 schannel ... server closed abruptly` / `OpenSSL SSL_read: unexpected eof` even after removing the proxy, while `api.github.com`, `raw.githubusercontent.com`, and `codeload.github.com` work fine. Large deltas (repo history with many assets) never finish at ~0.6 MB/s. Do not fight this: **upload via the GitHub Contents API instead** (reliable, and new files need no local repo sync).
3. **API upload without local sync** — use [scripts/github_api_upload.py](scripts/github_api_upload.py):
   ```bash
   python scripts/github_api_upload.py --repo mikyo-miao/goodjob --branch main --dir path/to/assets --prefix assets/<card-slug>
   ```
   The script reads the token via `git credential fill` (never printed, queried by repo owner username), skips files whose blob SHA-1 already matches (content-addressed, so re-runs are no-ops), and prints one raw URL per upload. Historical example (old repo): 御情仙途录 opening-hall card, 14 files under `assets/yqxtl/` on `xiwangliu36-arch/mikyo`.
4. **Local repo state after API uploads.** The remote branch moves ahead of the local checkout; the local working tree and an unpushed local commit may already contain identical content. Do NOT force-push (remote history contains commits from other machines, e.g. Su Nianzhi / Shen Yinchu assets). Leave refs alone — `git status` stays usable — and reconcile later with a successful `git fetch` followed by `git reset --hard origin/main` (safe to discard the local duplicate commits). Until the network cooperates, prefer the API for every upload.
5. **Verify every link before delivering.** `curl -sI -o /dev/null -w "%{http_code}" <raw-url>` must return 200 for each referenced asset; retry once on transient `000`.

### Map Story CG

Preserve the card's base `.story-image` layout and add only ID-to-URL mappings. The prompt must emit exactly matching class names and must not emit direct URLs.

### Map Interactive Status Images

Read [references/status-css-template.md](references/status-css-template.md) before editing paired status images. Important invariants:

- Use one character-scoped native select such as `.fy-img-select-wn` per character.
- Avoid shared selection rules that let one character switch another's image.
- Prefer real native `<select>` controls; hidden radio/label controls can focus without changing state in the renderer.
- Do not depend on inline `onclick` or `onchange`; they may be sanitized.
- For mod-owned interactive images, use a neutral wrapper such as `fy-status fy-mod` so static `fy-sfw`/`fy-nsfw` rules do not force both faces to the same image.
- Scene safety controls the initial flip checkbox: unchecked for SFW/front, checked for NSFW/back.
- The selected option and `<slug>-set-N` class must match. Avoid the previous visible set when the current prompt requires variation.
- Preserve the original visible status layout unless the user requests a redesign.

#### Alternative: static single-image pool scheme (no flip, 御情仙途录 style)

Some cards want static status images with no flip control: the model emits one real image class per present heroine, and CSS maps each class to exactly one hosted URL.

- Host under `assets/<slug>/status/<heroine-slug>/<a|b>/<original-filename>` and keep the original filenames (e.g. `1_04A.png`); A/B are independent random pools, never paired.
- Class convention: `img-<slug>-<a|b>-<source-id>` where `source-id` strips the pool letter and replaces `_` with `-` (`1_04A.png` → `img-sqd-a-1-04`). Mind the prefix: the class name already contains `img-`, do not add another.
- One CSS rule per asset: `.fy-status.img-sqd-a-1-04{--fy-portrait-img:url("https://raw.githubusercontent.com/mikyo-miao/goodjob/main/assets/<card-slug>/status/sqd/a/1_04A.png")}`; `.fy-portrait{background-image:var(--fy-portrait-img,none),<fallback gradient>}`.
- Prompt rule: `<details class="fy-girl fy-status heroine-{slug} {scene-class} {img-class}">`; `fy-sfw` ⇒ A pool only, `fy-nsfw` ⇒ B pool only; forbid `<img>`, URLs, inline style; equal-probability pick excluding the same heroine+pool classes used in the last 5 visible assistant replies.
- Keep the mapping block delimited by `STATUS_IMAGE_URLS_START`/`END` comments so it can be regenerated wholesale; never leave `: none` placeholder variables or legacy `*-set-NN` rules behind.
- Before delivery assert: N image classes ↔ N unique URLs 1:1, no duplicates, no stale set/placeholder tokens anywhere in the card JSON, and every raw URL returns 200 with matching SHA-256 (download-compare).

Keep follow-up suggestions separate from the main/status prompt when the app has a dedicated suggestion field. The main prompt should forbid visible w2g/action-option HTML; the suggestion prompt should output only the app's expected suggestion format.

### Update The Rili Editor

- Claim the already-open workshop editor when possible.
- Expand the custom-style accordion before reading its textarea.
- Preserve unrelated CSS and replace only a clearly marked generated mapping block.
- Insert prompt rules into the correct prompt field, before unrelated action-output rules when possible.
- Leave intro pages and unrelated fields untouched; record and compare their values around the edit.
- Save with the visible save button, wait for completion, then re-read the editor.
- Avoid base64 image payloads in the editor; use stable hosted direct links.

### Verify Rili Behavior

- Confirm all expected URLs, front/back mappings, select classes, card classes, and set names agree exactly.
- In an actual preview or faithful browser reproduction, change the native select and verify both computed background images change.
- Click the image and verify the flipper reveals the paired face.
- Test SFW/front unchecked and NSFW/back checked initial states.
- If buttons focus but do not switch, replace radio/label controls with the native-select template.
- Confirm unrelated editor fields and w2g separation remain unchanged after save.

## Shared Verification And Handoff

Before reporting completion:

- Parse the edited artifact successfully.
- Confirm each live image ID maps to exactly one intended URL and each expected output class exists.
- Confirm removed images leave no URL, CSS class, world-book ID, whitelist ID, or semantic-catalog record.
- Confirm status assets and story CG remain in their respective systems.
- Compare before and after and list the top-level fields intentionally changed.
- Retain a backup plus machine-readable audit manifest when working on a local card.
- Report any unmatched local files, unreachable URLs, duplicate IDs, or ambiguous semantic matches instead of silently guessing.

