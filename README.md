# Handfish Design System

A modern, accessible component library for creative tools. Built with Web Components and CSS Custom Properties.

Demo: [https://noisedeck.github.io/handfish/examples/](https://noisedeck.github.io/handfish/examples/)

## Features

- **Web Components** - Framework-agnostic custom elements that work anywhere
- **Light/Dark Mode** - Automatic theme support via `prefers-color-scheme` or manual `data-theme` attribute
- **Accessible** - ARIA-compliant components with keyboard navigation
- **Glassmorphism** - Modern UI effects with backdrop blur and semi-transparent surfaces
- **Form Integration** - Components support `ElementInternals` for native form participation
- **CSS Custom Properties** - Easily customize design tokens without modifying source

## Installation

```bash
npm install @noisedeck/handfish
```

## Quick Start

### Import Styles

```html
<link rel="stylesheet" href="@noisedeck/handfish/styles/index.css">
```

Or in JavaScript:

```js
import '@noisedeck/handfish/styles/index.css'
```

### Import Components

```js
// Import all components
import * as Handfish from '@noisedeck/handfish'

// Or import specific components
import { ToggleSwitch, SliderValue, ColorPicker } from '@noisedeck/handfish'
```

### Use Components

```html
<toggle-switch label="Enable feature"></toggle-switch>

<slider-value min="0" max="100" value="50" step="1" type="int"></slider-value>

<select-dropdown value="option1">
    <option value="option1">Option 1</option>
    <option value="option2">Option 2</option>
</select-dropdown>

<color-picker value="#a5b8ff"></color-picker>
```

## Components

### Toggle Switch

A boolean toggle control that replaces `<input type="checkbox">`.

```html
<toggle-switch
    name="darkMode"
    label="Dark Mode"
    checked
></toggle-switch>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `checked` | boolean | `false` | Current checked state |
| `label` | string | `''` | Label text |
| `name` | string | `''` | Form field name |
| `disabled` | boolean | `false` | Disabled state |

### Slider Value

A range slider with editable numeric value display. Uses `display: contents` to participate in parent grid layouts. Click the value to type an exact number.

```html
<slider-value
    name="volume"
    min="0"
    max="100"
    value="50"
    step="1"
    type="int"
></slider-value>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `min` | number | `0` | Minimum value |
| `max` | number | `100` | Maximum value |
| `value` | number | `0` | Current value |
| `step` | number | `0.01` | Step increment |
| `type` | string | `'float'` | Value type: `int` or `float` |
| `name` | string | `''` | Form field name |
| `disabled` | boolean | `false` | Disabled state |

Events: `input`, `change`

### Slider Control

A self-contained labeled slider with value readout. Supports compact and vertical variants.

```html
<slider-control
    label="X"
    min="0"
    max="1"
    value="0.5"
    precision="2"
></slider-control>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `min` | number | `0` | Minimum value |
| `max` | number | `1` | Maximum value |
| `value` | number | `0.5` | Current value |
| `step` | number | `0.01` | Step increment |
| `label` | string | `''` | Label text |
| `precision` | number | `2` | Decimal places to display |
| `compact` | boolean | `false` | Compact layout with tighter gaps |
| `vertical` | boolean | `false` | Vertical orientation |
| `disabled` | boolean | `false` | Disabled state |

Events: `input` (detail: `{ value }`), `change` (detail: `{ value }`)

### Select Dropdown

A custom dropdown select with keyboard navigation and search.

```html
<select-dropdown name="effect" value="blur">
    <option value="none">None</option>
    <option value="blur">Blur</option>
    <option value="glow">Glow</option>
</select-dropdown>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | string | `''` | Selected option value |
| `name` | string | `''` | Form field name |
| `disabled` | boolean | `false` | Disabled state |

Features:
- Type-ahead search when focused
- Arrow key navigation
- Auto-switches to dialog mode with 6+ options
- Escape to close

### Dropdown Menu

A trigger button with a dropdown menu for actions.

```html
<dropdown-menu label="Options" icon="more_vert">
    <dropdown-item value="edit" icon="edit">Edit</dropdown-item>
    <dropdown-item value="duplicate" icon="content_copy">Duplicate</dropdown-item>
    <dropdown-item divider></dropdown-item>
    <dropdown-item value="delete" destructive icon="delete">Delete</dropdown-item>
</dropdown-menu>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `label` | string | `''` | Trigger button text |
| `icon` | string | `''` | Material Symbols icon name |
| `align` | string | `'left'` | Menu alignment: `left` or `right` |
| `value` | string | `''` | Currently selected value (selectable mode) |
| `disabled` | boolean | `false` | Disabled state |

`<dropdown-item>` attributes: `value`, `icon`, `divider`, `destructive`

Events: `change` (detail: `{ value }`)

### Justify Button Group

A segmented control for text alignment selection.

```html
<justify-button-group
    name="alignment"
    value="center"
></justify-button-group>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | string | `'left'` | Current value: `left`, `center`, `right` |
| `name` | string | `''` | Form field name |
| `disabled` | boolean | `false` | Disabled state |

### Color Picker

A dropdown color picker with swatch trigger.

```html
<color-picker
    name="fillColor"
    value="#a5b8ff"
    alpha="1"
    mode="hsv"
></color-picker>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | string | `'#000000'` | Hex color value |
| `alpha` | number | `1` | Alpha/opacity (0-1) |
| `mode` | string | `'hsv'` | Color mode: `hsv`, `oklab`, or `oklch` |
| `inline` | boolean | `false` | Always show wheel (no dropdown) |
| `name` | string | `''` | Form field name |
| `required` | boolean | `false` | Required field |
| `disabled` | boolean | `false` | Disabled state |

Events: `input`, `change`, `colorinput` (detail: `{ value, alpha, rgb, hsv, oklch }`), `open`, `close`

### Color Wheel

The full color wheel interface (used inside Color Picker). Supports three color modes: HSV, OkLab, and OKLCH.

```html
<color-wheel
    value="#6bffa5"
    mode="hsv"
></color-wheel>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | string | `'#000000'` | Hex color value |
| `alpha` | number | `1` | Alpha/opacity (0-1) |
| `mode` | string | `'hsv'` | Color mode: `hsv`, `oklab`, or `oklch` |
| `name` | string | `''` | Form field name |
| `required` | boolean | `false` | Required field |
| `disabled` | boolean | `false` | Disabled state |

Methods:
- `getColor()` - Returns `{ value, alpha, rgb, hsv, oklch }`
- `setColor({ value, alpha, mode })` - Set color programmatically

Events:
- `input` - Fires during color selection
- `change` - Fires when selection is finalized
- `colorinput` - Fires with `detail: { value, alpha, rgb, hsv, oklch }`

### Color Swatch

A single color display with selection and tooltip.

```html
<color-swatch
    color="#a5b8ff"
    size="32"
    selected
    show-tooltip
></color-swatch>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `color` | string | `'#000000'` | Hex color value |
| `size` | number | `32` | Swatch size in pixels |
| `selected` | boolean | `false` | Selected state (shows outline ring) |
| `editable` | boolean | `false` | Enable double-click to edit |
| `show-tooltip` | boolean | `false` | Show hex tooltip on hover |
| `disabled` | boolean | `false` | Disabled state |

Events: `select` (detail: `{ color }`), `edit` (detail: `{ color }`)

### Gradient Stops

Draggable color stop handles for positioning colors in a gradient.

```html
<gradient-stops></gradient-stops>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `disabled` | boolean | `false` | Disabled state |

Methods:
- `setStops(colors, positions)` - Set colors (RGB 0-1 arrays) and positions (0-1)
- `getPositions()` - Get current position array
- `getSelectedIndex()` - Get selected stop index
- `setSelectedIndex(index)` - Set selected stop

Events: `select` (detail: `{ index }`), `input` (detail: `{ index, position, positions }`), `change` (detail: `{ index, positions }`), `delete` (detail: `{ index, positions, colors }`)

### Vector 3D Picker

A 3D vector picker with interactive sphere gizmo and XYZ sliders in a dialog modal.

```html
<vector3d-picker
    value="0,1,0"
    min="-1"
    max="1"
    step="0.01"
    normalized
></vector3d-picker>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | string | `'0,0,1'` | Comma-separated X,Y,Z values |
| `min` | number | `-1` | Minimum axis value |
| `max` | number | `1` | Maximum axis value |
| `step` | number | `0.01` | Step increment |
| `normalized` | boolean | `false` | Normalize to unit vector |
| `name` | string | `''` | Form field name |
| `disabled` | boolean | `false` | Disabled state |

Events: `input`, `change`

### Code Editor

A code editor with line numbers and pluggable syntax highlighting.

```html
<code-editor
    value="// Hello world"
    placeholder="Enter code..."
    line-numbers
></code-editor>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | string | `''` | Editor content |
| `placeholder` | string | `''` | Placeholder text |
| `readonly` | boolean | `false` | Read-only mode |
| `disabled` | boolean | `false` | Disabled state |
| `spellcheck` | boolean | `false` | Enable spell check |
| `line-numbers` | boolean | `true` | Show line numbers |
| `font-family` | string | — | Override font |
| `font-size` | string | — | Override font size |
| `background-color` | string | — | Override background |
| `background-opacity` | string | — | Override background opacity |
| `text-color` | string | — | Override text color |
| `caret-color` | string | — | Override caret color |
| `selection-color` | string | — | Override selection color |

Methods:
- `setTokenizer(fn)` - Set a syntax highlighting function: `(line: string) => Array<{type, text}>`
- `get/set value` - Editor content

Events: `input` (detail: `{ value }`), `forcerecompile`

```js
// Use with DSL tokenizer
import { dslTokenizer } from '@noisedeck/handfish'
editor.setTokenizer(dslTokenizer)
```

### Image Magnifier

A zoomed-in view of a canvas under the cursor for precise color picking. Shows crosshairs and the hex value of the center pixel.

```html
<image-magnifier zoom="8" size="120"></image-magnifier>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `active` | boolean | `false` | Show/hide the magnifier |
| `zoom` | number | `8` | Zoom level |
| `size` | number | `120` | Magnifier diameter in pixels |

Methods:
- `attachToCanvas(canvas)` - Set the source canvas to magnify
- `update(x, y)` - Update magnifier position and render

### Toast Notifications

Lightweight notification toasts with auto-dismiss. Exported as standalone functions (not a custom element).

```js
import { showToast, showSuccess, showError, showWarning, showInfo } from '@noisedeck/handfish'

showSuccess('Palette saved')
showError('Failed to load', { duration: 6000 })
showWarning('Unsaved changes')
showInfo('Copied to clipboard')
```

- `showToast(message, { type, duration })` - General toast (`type`: `info`, `success`, `error`, `warning`)
- `showSuccess(message, options)` - Success toast (default 2s)
- `showError(message, options)` - Error toast (default 6s)
- `showWarning(message, options)` - Warning toast (default 2s)
- `showInfo(message, options)` - Info toast (default 2s)

## Utilities

### Escape Handler

Stack-based escape key management for closing modals and dropdowns in the correct order.

```js
import { registerEscapeable, unregisterEscapeable, initEscapeHandler } from '@noisedeck/handfish'

initEscapeHandler()
registerEscapeable(element, () => closeMyModal())
unregisterEscapeable(element)
```

Exports: `registerEscapeable`, `unregisterEscapeable`, `closeTopmost`, `hasOpenEscapeables`, `initEscapeHandler`

### Tooltips

Hover tooltips for any element with a `data-title` attribute.

```js
import { initializeTooltips } from '@noisedeck/handfish'

initializeTooltips()
```

```html
<button data-title="Save palette">Save</button>
```

### Color Conversions

Comprehensive color conversion utilities. All RGB objects use `{r, g, b}` with 0-255 values.

```js
import { rgbToHex, parseHex, rgbToHsv, hsvToRgb, rgbToOklch, oklchToRgb } from '@noisedeck/handfish'
```

## Design Tokens

All visual values are controlled via CSS custom properties with the `--hf-` prefix. Colors use [OKLCH](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch) for perceptually uniform color manipulation. Override any token in your CSS:

```css
:root {
    /* Colors (OKLCH: lightness, chroma, hue) */
    --hf-color-1: oklch(13.9% 0.010 264);
    --hf-accent-3: oklch(79.5% 0.103 264);

    /* Typography */
    --hf-font-family: 'Your Font', sans-serif;

    /* Spacing */
    --hf-space-4: 1rem;
}
```

### Color Tokens

Colors are defined in OKLCH format. Dark mode uses hue 264°, light mode uses hue 90°.

| Token | Description |
|-------|-------------|
| `--hf-color-1` through `--hf-color-7` | Base palette (dark to light) |
| `--hf-accent-1` through `--hf-accent-4` | Accent colors (higher chroma) |
| `--hf-red`, `--hf-green`, `--hf-yellow`, `--hf-blue` | Semantic colors |

#### Semantic Aliases

These reference the base palette and auto-resolve when the theme changes:

| Token | Maps to | Description |
|-------|---------|-------------|
| `--hf-bg-base` | `--hf-color-1` | Page background |
| `--hf-bg-surface` | `--hf-color-2` | Card/panel background |
| `--hf-bg-elevated` | `--hf-color-3` | Elevated surface (inputs, buttons) |
| `--hf-bg-muted` | `--hf-color-4` | Muted/hover background |
| `--hf-text-muted` | `--hf-color-4` | Muted text |
| `--hf-text-dim` | `--hf-color-5` | Dim/secondary text |
| `--hf-text-normal` | `--hf-color-6` | Normal text |
| `--hf-text-bright` | `--hf-color-7` | Bright/emphasized text |
| `--hf-border-subtle` | `--hf-color-4` | Subtle borders |
| `--hf-accent` | `--hf-accent-3` | Primary accent |
| `--hf-accent-hover` | `--hf-accent-4` | Accent hover state |
| `--hf-border` | — | Semi-transparent accent border |
| `--hf-border-hover` | — | Border hover state |
| `--hf-border-focus` | — | Border focus state |

### Typography Tokens

| Token | Value |
|-------|-------|
| `--hf-font-family` | Nunito, system-ui, sans-serif |
| `--hf-font-family-mono` | 'Noto Sans Mono', monospace |
| `--hf-size-xs` | 0.625rem (10px) |
| `--hf-size-sm` | 0.75rem (12px) |
| `--hf-size-base` | 0.875rem (14px) |
| `--hf-size-md` | 1rem (16px) |
| `--hf-size-lg` | 1.125rem (18px) |
| `--hf-size-xl` | 1.25rem (20px) |
| `--hf-size-2xl` | 1.5rem (24px) |
| `--hf-weight-normal` | 400 |
| `--hf-weight-medium` | 500 |
| `--hf-weight-semibold` | 600 |
| `--hf-weight-bold` | 700 |

### Spacing Tokens

| Token | Value |
|-------|-------|
| `--hf-space-0` | 0 |
| `--hf-space-1` | 0.25rem (4px) |
| `--hf-space-2` | 0.5rem (8px) |
| `--hf-space-3` | 0.75rem (12px) |
| `--hf-space-4` | 1rem (16px) |
| `--hf-space-5` | 1.25rem (20px) |
| `--hf-space-6` | 1.5rem (24px) |
| `--hf-space-8` | 2rem (32px) |
| `--hf-space-10` | 2.5rem (40px) |
| `--hf-space-12` | 3rem (48px) |

### Border Radius Tokens

| Token | Value |
|-------|-------|
| `--hf-radius-sm` | 0.25rem (4px) |
| `--hf-radius-md` | 0.375rem (6px) |
| `--hf-radius` | 0.5rem (8px) |
| `--hf-radius-lg` | 0.75rem (12px) |
| `--hf-radius-xl` | 1rem (16px) |
| `--hf-radius-pill` | 999px |
| `--hf-radius-full` | 50% |

### Shadow Tokens

| Token | Value |
|-------|-------|
| `--hf-shadow-sm` | 0 1px 2px rgba(0, 0, 0, 0.1) |
| `--hf-shadow` | 0 2px 4px rgba(0, 0, 0, 0.15) |
| `--hf-shadow-md` | 0 4px 8px rgba(0, 0, 0, 0.2) |
| `--hf-shadow-lg` | 0 8px 16px rgba(0, 0, 0, 0.25) |
| `--hf-shadow-xl` | 0 16px 32px rgba(0, 0, 0, 0.3) |

### Control Tokens

| Token | Value |
|-------|-------|
| `--hf-control-height-sm` | 1.5rem (24px) |
| `--hf-control-height` | 1.875rem (30px) |
| `--hf-control-height-lg` | 2.25rem (36px) |
| `--hf-control-padding` | 0.25rem 0.5rem |

### Transition Tokens

| Token | Value |
|-------|-------|
| `--hf-transition-fast` | 0.1s ease |
| `--hf-transition` | 0.15s ease |
| `--hf-transition-slow` | 0.3s ease |

### Z-Index Scale

| Token | Value |
|-------|-------|
| `--hf-z-dropdown` | 100 |
| `--hf-z-sticky` | 200 |
| `--hf-z-fixed` | 300 |
| `--hf-z-modal-backdrop` | 400 |
| `--hf-z-modal` | 500 |
| `--hf-z-popover` | 600 |
| `--hf-z-tooltip` | 700 |

### Glassmorphism Tokens

| Token | Value |
|-------|-------|
| `--hf-glass-blur` | blur(20px) |
| `--hf-glass-blur-sm` | blur(8px) |
| `--hf-glass-blur-lg` | blur(32px) |
| `--hf-backdrop` | rgba(0, 0, 0, 0.6) |
| `--hf-surface-opacity` | 92% |
| `--hf-panel-opacity` | 85% |
| `--hf-header-opacity` | 65% |

## Theming

### Automatic (System Preference)

Colors automatically adapt to `prefers-color-scheme`.

### Manual Theme

```html
<html data-theme="dark">
<!-- or -->
<html data-theme="light">
```

```js
// Toggle theme
document.documentElement.dataset.theme =
    document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
```

## Utility Classes

### Typography

```html
<p class="hf-text-sm">Small text</p>
<p class="hf-font-bold">Bold text</p>
<p class="hf-mono">Monospace text</p>
<p class="hf-uppercase">Uppercase</p>
<p class="hf-text-accent">Accent color</p>
```

### Layout

```html
<div class="hf-flex hf-gap-2 hf-items-center">
    <!-- Flexbox with gap -->
</div>
```

### Surfaces

```html
<div class="hf-panel">Glass panel with border</div>
<div class="hf-card">Card with padding</div>
```

### Buttons

```html
<button class="hf-btn">Default</button>
<button class="hf-btn hf-btn-primary">Primary</button>
<button class="hf-btn hf-btn-ghost">Ghost</button>
```

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 15.4+
- Edge 90+

Requires support for:
- Custom Elements v1
- CSS Custom Properties
- `oklch()` color values
- `color-mix()` CSS function
- `backdrop-filter` (with fallback)

## Development

```bash
# Install dependencies
npm install

# Run examples
npm run dev

# Open http://localhost:3000/examples/
```

### Testing

Visual regression tests use Playwright to screenshot the examples page and compare against baselines:

```bash
npm test              # Run visual regression tests
npm run test:update   # Update baseline snapshots after intentional changes
```

## License

MIT
