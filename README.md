# 🐟 Handfish Design System

A modern, accessible component library for creative tools. Built with Web Components and CSS Custom Properties.

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
<link rel="stylesheet" href="@noisedeck/handfish/dist/styles/index.css">
```

Or in JavaScript:

```js
import '@noisedeck/handfish/dist/styles/index.css'
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

<slider-value min="0" max="100" value="50" suffix="%"></slider-value>

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

A range slider with editable numeric value display.

```html
<slider-value
    name="volume"
    min="0"
    max="100"
    value="50"
    step="1"
    suffix="%"
></slider-value>
```

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `min` | number | `0` | Minimum value |
| `max` | number | `100` | Maximum value |
| `value` | number | `50` | Current value |
| `step` | number | `1` | Step increment |
| `suffix` | string | `''` | Suffix shown after value |
| `disabled` | boolean | `false` | Disabled state |

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
| `required` | boolean | `false` | Required field |

Features:
- Type-ahead search when focused
- Arrow key navigation
- Auto-switches to dialog mode with 6+ options
- Escape to close

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
| `mode` | string | `'hsv'` | Color mode: `hsv` or `oklch` |
| `inline` | boolean | `false` | Always show wheel (no dropdown) |
| `disabled` | boolean | `false` | Disabled state |

### Color Wheel

The full color wheel interface (used inside Color Picker).

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
| `mode` | string | `'hsv'` | Color mode: `hsv` or `oklch` |
| `disabled` | boolean | `false` | Disabled state |

Methods:
- `getColor()` - Returns `{ value, alpha, rgb, hsv, oklch }`
- `setColor({ value, alpha, mode })` - Set color programmatically

Events:
- `input` - Fires during color selection
- `change` - Fires when selection is finalized
- `colorinput` - Fires with `detail: { value, alpha, rgb, hsv, oklch }`

## Design Tokens

All colors, spacing, and other values are controlled via CSS custom properties. Override them in your CSS:

```css
:root {
    /* Colors */
    --hf-color-1: #07090d;
    --hf-accent-3: #a5b8ff;
    
    /* Typography */
    --hf-font-family: 'Your Font', sans-serif;
    
    /* Spacing */
    --hf-space-4: 1rem;
    
    /* Radii */
    --hf-radius: 0.5rem;
}
```

### Color Tokens

| Token | Description |
|-------|-------------|
| `--hf-color-1` through `--hf-color-7` | Base palette (dark to light) |
| `--hf-accent-1` through `--hf-accent-4` | Accent colors |
| `--hf-red`, `--hf-green`, `--hf-yellow` | Semantic colors |

### Spacing Tokens

| Token | Value |
|-------|-------|
| `--hf-space-1` | 0.25rem (4px) |
| `--hf-space-2` | 0.5rem (8px) |
| `--hf-space-3` | 0.75rem (12px) |
| `--hf-space-4` | 1rem (16px) |
| `--hf-space-6` | 1.5rem (24px) |

### Border Radius Tokens

| Token | Value |
|-------|-------|
| `--hf-radius-sm` | 0.25rem (4px) |
| `--hf-radius` | 0.5rem (8px) |
| `--hf-radius-lg` | 0.75rem (12px) |
| `--hf-radius-pill` | 999px |

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
- `color-mix()` CSS function
- `backdrop-filter` (with fallback)

## Development

```bash
# Install dependencies
npm install

# Run examples
npx serve .

# Open http://localhost:3000/examples/
```

## License

MIT © Noisedeck
