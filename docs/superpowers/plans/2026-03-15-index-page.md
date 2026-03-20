# Handfish Index Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Jekyll-rendered README with a standalone HTML index page styled with handfish corpo theme, serving as the canonical reference docs.

**Architecture:** Single `index.html` at repo root using handfish dist styles (corpo theme) with zero-CLS Inter font loading. All README content ported to semantic HTML. Deploy pipeline simplified to remove Jekyll dependency. README slimmed to contributor shim.

**Tech Stack:** HTML, CSS (handfish tokens/themes), vanilla JS (minimal — nav scroll only)

---

## Chunk 1: Create index.html

### Task 1: Create the index page

**Files:**
- Create: `index.html`

The page uses the same pattern as `examples/index.html`:
- Zero-CLS font loading for Inter (corpo theme) + Nunito/Noto Sans Mono (handfish defaults)
- Preload blank fonts
- Load handfish styles from `dist/`
- `data-theme="corporate"`
- Sticky nav sidebar with section links
- All README sections ported to HTML: Features, Usage (styles, components, font loading), Components (14 components with attribute tables), Utilities, Design Tokens (all token tables), Theming, Utility Classes, Browser Support
- Link to `/examples/` as live demo
- Code blocks use `<pre><code>` styled with handfish mono tokens

- [ ] **Step 1: Write the full index.html**

Single file, all content inline. Structure:
```
<head>
  - Preload Inter Blank, Nunito Blank, Noto Sans Mono Blank
  - @font-face declarations (Inter Blank block, Inter swap, Nunito Blank block, Nunito swap, Noto Sans Mono Blank block, Noto Sans Mono swap)
  - html font-family: Inter, 'Inter Blank'
  - Link to dist/styles/index.css
  - Link to dist/styles/themes/corporate.css
  - Inline page styles (nav, layout, code blocks, tables)
</head>
<body data-theme="corporate">
  <nav> sidebar with section anchors </nav>
  <main> all doc sections </main>
</body>
```

- [ ] **Step 2: Build and verify locally**

Run: `npm run build && npx serve . -p 4000`
Open: `http://localhost:4000/`
Expected: Corpo-themed docs page with all sections, working nav, zero-CLS fonts

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add standalone index page with corpo theme"
```

## Chunk 2: Update build pipeline and README

### Task 2: Update bundle.js to copy index.html

**Files:**
- Modify: `scripts/bundle.js`

- [ ] **Step 1: Add index.html copy to build script**

After the site files copy block (~line 107), add a copy of root `index.html` to `dist/site/index.html` (replacing the examples copy for site root).

Actually — the current flow copies `examples/index.html` to `dist/site/index.html`. The new flow should copy root `index.html` to `dist/site/index.html` and `examples/index.html` to `dist/site/examples/index.html`.

- [ ] **Step 2: Commit**

```bash
git add scripts/bundle.js
git commit -m "chore: update build to copy index.html as site root"
```

### Task 3: Update deploy workflow — remove Jekyll

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Delete: `_config.yml`

- [ ] **Step 1: Replace Jekyll build+deploy with direct rsync of dist/site/**

Remove the `Build Jekyll site` step and the `Deploy site` step. Replace with a single step that rsyncs `dist/site/` to the server content root.

Remove `_config.yml` and `README.md` from the workflow path triggers.
Add `index.html` to the path triggers.

- [ ] **Step 2: Delete _config.yml**

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git rm _config.yml
git commit -m "chore: remove Jekyll, deploy built site directly"
```

### Task 4: Slim README to shim

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README content**

```markdown
# Handfish Design System

A modern, accessible component library for creative tools. Built with Web Components and CSS Custom Properties.

**Docs & API Reference:** [handfish.noisefactor.io](https://handfish.noisefactor.io)
**Live Demo:** [handfish.noisefactor.io/examples/](https://handfish.noisefactor.io/examples/)

## Quick Start

```html
<link rel="stylesheet" href="https://handfish.noisefactor.io/0.9.0/styles/index.css">

<script type="importmap">
{ "imports": { "handfish": "https://handfish.noisefactor.io/0.9.0/handfish.esm.min.js" } }
</script>

<script type="module">
import { ToggleSwitch, SliderValue, ColorPicker } from 'handfish'
</script>
```

## Development

```bash
npm install
npm run dev
# Open http://localhost:3000/examples/
```

### Testing

```bash
npm test              # Visual regression tests
npm run test:update   # Update baselines
```

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: slim README to shim, point at site for full docs"
```

### Task 5: Build and verify everything

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: dist/site/ contains index.html (docs) and examples/index.html (demos)

- [ ] **Step 2: Verify locally**

Run: `npx serve . -p 4000`
Check: `/` shows corpo docs, `/examples/` shows component demos

- [ ] **Step 3: Squash commits**

Per ground rules, squash local commits before pushing.
