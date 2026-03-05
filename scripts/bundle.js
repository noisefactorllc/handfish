#!/usr/bin/env node
/**
 * Build single-file Handfish bundles with esbuild.
 * Produces ESM and minified ESM outputs, plus copies tokens CSS.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { build } from 'esbuild'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const entryPoint = path.join(repoRoot, 'src', 'index.js')
const distDir = path.join(repoRoot, 'dist')
const tokensCssPath = path.join(repoRoot, 'src', 'styles', 'tokens.css')

/**
 * Get git hash (first 8 chars) with dirty indicator
 */
function getGitBuildInfo() {
    try {
        const hash = execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim().slice(0, 8)
        const dirty = execSync('git status --porcelain', { cwd: repoRoot, encoding: 'utf8' }).trim() !== ''
        return hash + (dirty ? ' (dirty)' : '')
    } catch {
        return 'unknown'
    }
}

if (!fs.existsSync(entryPoint)) {
    console.error(`Bundle entry point not found: ${entryPoint}`)
    process.exit(1)
}

fs.mkdirSync(distDir, { recursive: true })

const banner = `/**
 * Handfish Design System
 * Copyright (c) 2025-${new Date().getFullYear()} Noise Factor LLC. https://noisefactor.io/
 * SPDX-License-Identifier: MIT
 * Build: ${getGitBuildInfo()}
 * Date: ${new Date().toISOString()}
 */`

const sharedOptions = {
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'browser',
    target: ['es2020'],
    legalComments: 'none',
    logLevel: 'warning',
}

async function buildBundle() {
    console.log('Bundling Handfish with esbuild...')

    await build({
        ...sharedOptions,
        format: 'esm',
        outfile: path.join(distDir, 'handfish.esm.js'),
        minify: false,
        banner: { js: banner },
    })

    await build({
        ...sharedOptions,
        format: 'esm',
        outfile: path.join(distDir, 'handfish.esm.min.js'),
        minify: true,
        banner: { js: banner },
    })

    // Copy tokens CSS
    if (fs.existsSync(tokensCssPath)) {
        fs.copyFileSync(tokensCssPath, path.join(distDir, 'handfish-tokens.css'))
        console.log('  - handfish-tokens.css (copied)')
    } else {
        console.warn('Warning: tokens.css not found at', tokensCssPath)
    }

    // Copy all styles (preserving directory structure)
    const stylesDir = path.join(repoRoot, 'src', 'styles')
    const distStylesDir = path.join(distDir, 'styles')

    function copyDirSync(src, dest) {
        fs.mkdirSync(dest, { recursive: true })
        for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
            const srcPath = path.join(src, entry.name)
            const destPath = path.join(dest, entry.name)
            if (entry.isDirectory()) {
                copyDirSync(srcPath, destPath)
            } else {
                fs.copyFileSync(srcPath, destPath)
                console.log(`  - styles/${path.relative(distStylesDir, destPath)}`)
            }
        }
    }

    copyDirSync(stylesDir, distStylesDir)

    // Copy site files (examples page)
    const siteDir = path.join(distDir, 'site')
    fs.mkdirSync(siteDir, { recursive: true })
    const examplesDir = path.join(repoRoot, 'examples')
    for (const file of ['index.html', 'favicon.svg']) {
        const src = path.join(examplesDir, file)
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, path.join(siteDir, file))
            console.log(`  - site/${file}`)
        }
    }

    console.log('Bundles written to dist/')
    console.log('  - handfish.esm.js')
    console.log('  - handfish.esm.min.js')
}

buildBundle().catch((err) => {
    console.error(err)
    process.exit(1)
})
