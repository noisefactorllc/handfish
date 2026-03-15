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
