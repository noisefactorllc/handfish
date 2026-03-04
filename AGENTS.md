# Handfish Agent Instructions

## Project Overview

Handfish is a shared UI component library for the Noise Factor product ecosystem (Noisedeck, Tetra, and future apps). It provides Web Components, design tokens, and utility CSS. No build step — ES modules served directly to the browser.

Demo: https://noisedeck.github.io/handfish/examples/

## Commands

```bash
npm run dev       # Start dev server at http://localhost:3000
                  # Open http://localhost:3000/examples/ for the style guide
```

```bash
npm test              # Playwright visual regression tests
npm run test:update   # Update baseline snapshots after intentional changes
node --check <file>   # Syntax validation for JS files
```

## Architecture

### No Build Step

All source is vanilla JavaScript ES modules and CSS. No bundler, no transpilation. Components self-register as custom elements when imported.

### Light DOM Style Injection

Components inject styles into the document head (not Shadow DOM). Each component checks for an existing `<style>` by ID before injecting:

```javascript
const STYLES_ID = 'hf-my-component-styles'
if (!document.getElementById(STYLES_ID)) {
    const style = document.createElement('style')
    style.id = STYLES_ID
    style.textContent = `/* component styles */`
    document.head.appendChild(style)
}
```

This pattern means:
- Components participate in the global CSS cascade
- Parent apps can override styles with higher specificity
- No Shadow DOM boundary to work around

### CSS Variables

All design tokens use the `--hf-` prefix. Components reference these for colors, spacing, radii, fonts:

- `--hf-color-1` through `--hf-color-7` — Base palette (dark to light, OKLCH format)
- `--hf-accent-1` through `--hf-accent-4` — Accent colors (higher chroma)
- `--hf-red`, `--hf-green`, `--hf-yellow`, `--hf-blue` — Semantic colors
- `--hf-bg-base`, `--hf-bg-surface`, `--hf-bg-elevated`, `--hf-bg-muted` — Background aliases
- `--hf-text-muted`, `--hf-text-dim`, `--hf-text-normal`, `--hf-text-bright` — Text aliases
- `--hf-border-subtle`, `--hf-border`, `--hf-border-hover`, `--hf-border-focus` — Border aliases
- `--hf-accent`, `--hf-accent-hover`, `--hf-accent-bg` — Accent aliases
- `--hf-radius-sm`, `--hf-radius`, `--hf-radius-lg` — Border radii
- `--hf-space-1` through `--hf-space-12` — Spacing scale
- `--hf-shadow-sm` through `--hf-shadow-xl` — Box shadows
- `--hf-control-height`, `--hf-control-padding` — Control sizing
- `--hf-font-family`, `--hf-font-family-mono` — Typography
- `--hf-size-xs` through `--hf-size-2xl` — Font sizes
- `--hf-weight-normal` through `--hf-weight-bold` — Font weights
- `--hf-transition-fast`, `--hf-transition`, `--hf-transition-slow` — Transitions
- `--hf-z-dropdown` through `--hf-z-tooltip` — Z-index scale
- `--hf-glass-blur`, `--hf-backdrop` — Glassmorphism effects

When adapting components from other repos, always remap their CSS variables to `--hf-*` equivalents.

### Color Format

Design tokens use **OKLCH** format (`oklch(lightness% chroma hue)`). Dark mode uses hue 264°, light mode uses hue 90°.

Internal color objects use `{r, g, b}` with **0-255** integer values. Functions in `colorConversions.js` follow this convention:

```javascript
rgbToHex({ r: 255, g: 128, b: 0 })  // => '#ff8000'
parseHex('#ff8000')                    // => { r: 255, g: 128, b: 0 }
```

## File Organization

```
src/
  index.js                           # All public exports
  styles/
    tokens.css                       # Design tokens (CSS custom properties, OKLCH colors)
    index.css                        # Main stylesheet (imports tokens, base styles, utilities)
    forms.css                        # Form control styles
    dialogs.css                      # Dialog/modal base styles
    menus-and-toolbars.css           # Menu and toolbar styles
    tags-and-tabs.css                # Tag and tab styles
  fonts/                             # Nunito, Noto Sans Mono, Material Symbols
  utils/
    colorConversions.js              # RGB/HSV/OkLab/OKLCH/Hex conversions
    escapeHandler.js                 # Stack-based Escape key management
    tooltips.js                      # data-title hover tooltips
  components/
    <name>/
      <Name>.js                      # Component class + custom element registration
tests/
  visual.spec.js                     # Playwright visual regression tests
  snapshots/                         # Baseline screenshots (dark + light mode)
examples/
  index.html                         # Comprehensive style guide / demo page
playwright.config.js                 # Playwright test configuration
```

### Component Directory Convention

Each component lives in `src/components/<tag-name>/<ClassName>.js`. The file both defines and registers the custom element:

```javascript
class MyComponent extends HTMLElement { /* ... */ }
customElements.define('my-component', MyComponent)
export { MyComponent }
```

### Exports

All public API is re-exported from `src/index.js`. When adding a new component or utility, add its export there.

## Components (15)

| Component | Tag | Source |
|-----------|-----|--------|
| Toggle Switch | `<toggle-switch>` | Original |
| Slider Value | `<slider-value>` | Original |
| Slider Control | `<slider-control>` | From Tetra |
| Select Dropdown | `<select-dropdown>` | Original |
| Dropdown Menu | `<dropdown-menu>` | From Tetra |
| Justify Button Group | `<justify-button-group>` | Original |
| Color Picker | `<color-picker>` | Original |
| Color Wheel | `<color-wheel>` | From Tetra (3 modes: HSV, OkLab, OKLCH) |
| Color Swatch | `<color-swatch>` | From Tetra |
| Gradient Stops | `<gradient-stops>` | From Tetra |
| Vector 3D Picker | `<vector3d-picker>` | From Noisedeck |
| Code Editor | `<code-editor>` | From Noisedeck (pluggable tokenizers) |
| Image Magnifier | `<image-magnifier>` | From Tetra |
| Toast | (functions, not element) | From Tetra |
| Tooltips | (init function) | From Tetra |

## Conventions

1. **`--hf-` prefix** — All CSS variables. No bare `--color-*` or `--accent-*`.
2. **No `!important`** — Increase specificity instead.
3. **No inline styles** — Except for dynamic values from user data (positions, colors).
4. **No Shadow DOM** — Light DOM with style injection pattern.
5. **Form association** — Use `static formAssociated = true` and `attachInternals()` for form-participating components.
6. **Event conventions** — `input` for continuous changes (during drag), `change` for committed changes (on release). Use `CustomEvent` with `detail` for component-specific data.
7. **Attribute/property parity** — Observed attributes should have matching getters/setters.

## Adapting Components from Other Repos

When copying components from Noisedeck or Tetra:

1. Remap CSS variables: `--color*` → `--hf-color-*`, `--accent*` → `--hf-accent-*`, etc.
2. Remap font variables: `--font-mono` → `--hf-font-family-mono`
3. Update import paths: `../../utils/colorConversions.js` for color functions
4. Use handfish function names (e.g., `rgbToHex`, `parseHex`, `rgbToHsv`)
5. Replace any escape handler imports with `../../utils/escapeHandler.js`
6. Add the component export to `src/index.js`
7. Add a demo section in `examples/index.html`
8. Run `node --check` on the new file to verify syntax

## Development

The dev server serves the project root so that `examples/index.html` can reference `../src/` paths:

```bash
npm run dev
# http://localhost:3000/examples/
```

The examples page is also deployed via GitHub Pages at the repo root, so the demo works at `https://noisedeck.github.io/handfish/examples/`.
