import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './tests',
    snapshotDir: './tests/snapshots',
    snapshotPathTemplate: '{snapshotDir}/{arg}{ext}',
    // Sandboxed CI runners often cap threads at ~256 (cgroup pids.max); three
    // concurrent Chromium instances exceed it and pages crash at launch. One
    // worker keeps the suite deterministic everywhere; every test still runs
    // with the same assertions and tolerances.
    workers: 1,
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
                },
            },
        },
    ],
})
