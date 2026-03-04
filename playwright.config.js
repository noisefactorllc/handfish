import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './tests',
    snapshotDir: './tests/snapshots',
    snapshotPathTemplate: '{snapshotDir}/{arg}{ext}',
    use: {
        baseURL: 'http://localhost:3000',
        viewport: { width: 1280, height: 720 },
    },
    webServer: {
        command: 'npx serve -l 3000',
        port: 3000,
        reuseExistingServer: true,
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' },
        },
    ],
})
