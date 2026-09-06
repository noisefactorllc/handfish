<!-- repo-hero -->
<a href="https://handfish.noisefactor.io/"><img src="docs/hero.jpg" alt="Handfish Design system: UI components and styles" width="100%"></a>

<sub>Open source from <a href="https://noisefactor.io">Noise Factor</a> &middot; <a href="https://github.com/noisefactorllc">more projects</a></sub>

# Handfish Design System

A modern, accessible component library for creative tools. Built with Web Components and CSS Custom Properties.

**Docs & API Reference:** [handfish.noisefactor.io](https://handfish.noisefactor.io)

**Live Demo:** [handfish.noisefactor.io/examples/](https://handfish.noisefactor.io/examples/)

## Quick Start

```html
<link rel="stylesheet" href="https://handfish.noisefactor.io/0/styles/index.css">

<script type="importmap">
{ "imports": { "handfish": "https://handfish.noisefactor.io/0/handfish.esm.min.js" } }
</script>

<script type="module">
import { ToggleSwitch, SliderValue, ColorPicker } from 'handfish'
</script>
```

### Pinning levels

The CDN exposes three URL shapes so you can choose how much drift between deploys your application tolerates:

| URL shape | Meaning | When to use |
|-----------|---------|-------------|
| `handfish.noisefactor.io/0` | Rolling latest within **major 0**. Automatically tracks every minor and patch release until a `1.0` ships. At that point `/0` freezes. Consumers explicitly migrate to `/1`. | **Most integrations.** No code change needed for minor upgrades. |
| `handfish.noisefactor.io/0.10` | Rolling latest within the **0.10 minor series**. Stays on `0.10.x` even if `0.11` or `1.0` ships. | Patch-level updates with explicit control over minor upgrades. |
| `handfish.noisefactor.io/0.10.1` | **Exact pin**, immutable. Contents never change once published. | Reproducible builds, frozen historical versions. |

The Quick Start above uses `/0`. Substitute any of the shapes in the table. The examples on the [handfish docs page](https://handfish.noisefactor.io) all use `/0` as well.

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
