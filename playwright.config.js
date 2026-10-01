import { defineConfig } from '@playwright/test'
import { mkdtempSync, writeFileSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Deterministic mono rendering for the visual goldens: hosts without the
// MS-font aliases substitute 'Courier New' with different-metric fonts (e.g.
// DejaVu Sans Mono), which shifts the terminal theme's layout by ~20px
// against the goldens captured on CI (where playwright --with-deps provides
// metric-compatible Liberation Mono). Pin 'Courier New' to the vendored
// Liberation Mono in every environment so the goldens are host-independent.
// Test-only: the shipped theme CSS and the goldens are not changed.
const fontDir = mkdtempSync(join(tmpdir(), 'hf-fontconfig-'))
copyFileSync(new URL('./tests/fonts/LiberationMono-Regular.ttf', import.meta.url).pathname, join(fontDir, 'LiberationMono-Regular.ttf'))
copyFileSync(new URL('./tests/fonts/LiberationMono-Bold.ttf', import.meta.url).pathname, join(fontDir, 'LiberationMono-Bold.ttf'))
writeFileSync(join(fontDir, 'fonts.conf'), `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>
  <dir>${fontDir}</dir>
  <cachedir>${fontDir}/cache</cachedir>
  <match target="pattern"><test name="family"><string>Courier New</string></test><edit name="family" mode="assign" binding="strong"><string>Liberation Mono</string></edit></match>
</fontconfig>
`)

export default defineConfig({
    testDir: './tests',
    snapshotDir: './tests/snapshots',
    snapshotPathTemplate: '{snapshotDir}/{arg}{ext}',
    // Sandboxed runners often cap threads at ~256 (cgroup pids.max) and /dev/shm
    // at 64MB; concurrent Chromium instances exceed both and pages crash at
    // launch. One worker keeps the suite deterministic there; CI environments
    // (CI=true) keep the parallel default. Every test still runs with the same
    // assertions and tolerances.
    workers: process.env.CI ? undefined : 1,
    use: {
        baseURL: 'http://localhost:3000',
        viewport: { width: 1280, height: 720 },
    },
    webServer: {
        command: 'npx serve -l tcp://localhost:3000',
        port: 3000,
        reuseExistingServer: true,
    },
    projects: [
        {
            name: 'chromium',
            use: {
                browserName: 'chromium',
                launchOptions: {
                    args: ['--disable-dev-shm-usage'],
                    env: { FONTCONFIG_FILE: join(fontDir, 'fonts.conf') },
                },
            },
        },
    ],
})
