/**
 * Color Conversion Utilities
 *
 * All conversions maintain precision and are round-trippable within reasonable tolerances.
 * Internal representation uses linear values where appropriate.
 *
 * @module utils/colorConversions
 */

// ============================================================================
// sRGB <-> Linear sRGB
// ============================================================================

/**
 * Convert sRGB component (0-1) to linear RGB
 * @param {number} c - sRGB component value (0-1)
 * @returns {number} Linear RGB value (0-1)
 */
export function sRGBToLinear(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/**
 * Convert linear RGB component to sRGB (0-1)
 * @param {number} c - Linear RGB value (0-1)
 * @returns {number} sRGB component value (0-1)
 */
export function linearToSRGB(c) {
    return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
}

/**
 * Convert sRGB color to linear RGB
 * @param {{r: number, g: number, b: number}} rgb - sRGB values (0-255)
 * @returns {{r: number, g: number, b: number}} Linear RGB values (0-1)
 */
export function sRGBToLinearRGB(rgb) {
    return {
        r: sRGBToLinear(rgb.r / 255),
        g: sRGBToLinear(rgb.g / 255),
        b: sRGBToLinear(rgb.b / 255)
    }
}

/**
 * Convert linear RGB to sRGB
 * @param {{r: number, g: number, b: number}} linear - Linear RGB values (0-1)
 * @returns {{r: number, g: number, b: number}} sRGB values (0-255)
 */
export function linearRGBToSRGB(linear) {
    return {
        r: Math.round(linearToSRGB(linear.r) * 255),
        g: Math.round(linearToSRGB(linear.g) * 255),
        b: Math.round(linearToSRGB(linear.b) * 255)
    }
}

// ============================================================================
// RGB <-> HSV
// ============================================================================

/**
 * Convert RGB to HSV
 * @param {{r: number, g: number, b: number}} rgb - RGB values (0-255)
 * @returns {{h: number, s: number, v: number}} HSV values (h: 0-360, s: 0-100, v: 0-100)
 */
export function rgbToHsv(rgb) {
    const r = rgb.r / 255
    const g = rgb.g / 255
    const b = rgb.b / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min

    let h = 0
    if (delta !== 0) {
        if (max === r) {
            h = ((g - b) / delta) % 6
        } else if (max === g) {
            h = (b - r) / delta + 2
        } else {
            h = (r - g) / delta + 4
        }
        h *= 60
        if (h < 0) h += 360
    }

    const s = max === 0 ? 0 : (delta / max) * 100
    const v = max * 100

    return { h, s, v }
}

/**
 * Convert HSV to RGB
 * @param {{h: number, s: number, v: number}} hsv - HSV values (h: 0-360, s: 0-100, v: 0-100)
 * @returns {{r: number, g: number, b: number}} RGB values (0-255)
 */
export function hsvToRgb(hsv) {
    const h = ((hsv.h % 360) + 360) % 360 // Normalize hue
    const s = hsv.s / 100
    const v = hsv.v / 100

    const c = v * s
    const x = c * (1 - Math.abs((h / 60) % 2 - 1))
    const m = v - c

    let r, g, b

    if (h < 60) {
        [r, g, b] = [c, x, 0]
    } else if (h < 120) {
        [r, g, b] = [x, c, 0]
    } else if (h < 180) {
        [r, g, b] = [0, c, x]
    } else if (h < 240) {
        [r, g, b] = [0, x, c]
    } else if (h < 300) {
        [r, g, b] = [x, 0, c]
    } else {
        [r, g, b] = [c, 0, x]
    }

    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
    }
}

// ============================================================================
// Linear RGB <-> OKLab
// ============================================================================

/**
 * Convert linear RGB to OKLab
 * @param {{r: number, g: number, b: number}} linear - Linear RGB values (0-1)
 * @returns {{l: number, a: number, b: number}} OKLab values
 */
export function linearRGBToOKLab(linear) {
    // Linear RGB to LMS (cone responses)
    const l_ = 0.4122214708 * linear.r + 0.5363325363 * linear.g + 0.0514459929 * linear.b
    const m_ = 0.2119034982 * linear.r + 0.6806995451 * linear.g + 0.1073969566 * linear.b
    const s_ = 0.0883024619 * linear.r + 0.2817188376 * linear.g + 0.6299787005 * linear.b

    // Cube root for perceptual uniformity
    const l = Math.cbrt(l_)
    const m = Math.cbrt(m_)
    const s = Math.cbrt(s_)

    return {
        l: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
        a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
        b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    }
}

/**
 * Convert OKLab to linear RGB
 * @param {{l: number, a: number, b: number}} lab - OKLab values
 * @returns {{r: number, g: number, b: number}} Linear RGB values (0-1, may be out of gamut)
 */
export function okLabToLinearRGB(lab) {
    // OKLab to LMS
    const l_ = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b
    const m_ = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b
    const s_ = lab.l - 0.0894841775 * lab.a - 1.2914855480 * lab.b

    // Cube to reverse the cube root
    const l = l_ * l_ * l_
    const m = m_ * m_ * m_
    const s = s_ * s_ * s_

    // LMS to linear RGB
    return {
        r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    }
}

// ============================================================================
// OKLab <-> OKLCH
// ============================================================================

/**
 * Convert OKLab to OKLCH
 * @param {{l: number, a: number, b: number}} lab - OKLab values
 * @returns {{l: number, c: number, h: number}} OKLCH values (l: 0-1, c: 0-~0.4, h: 0-360)
 */
export function okLabToOKLCH(lab) {
    const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b)
    let h = Math.atan2(lab.b, lab.a) * (180 / Math.PI)
    if (h < 0) h += 360

    return { l: lab.l, c, h }
}

/**
 * Convert OKLCH to OKLab
 * @param {{l: number, c: number, h: number}} lch - OKLCH values (l: 0-1, c: 0-~0.4, h: 0-360)
 * @returns {{l: number, a: number, b: number}} OKLab values
 */
export function oklchToOKLab(lch) {
    const hRad = lch.h * (Math.PI / 180)
    return {
        l: lch.l,
        a: lch.c * Math.cos(hRad),
        b: lch.c * Math.sin(hRad)
    }
}

// ============================================================================
// High-level conversions
// ============================================================================

/**
 * Convert RGB to OKLCH
 * @param {{r: number, g: number, b: number}} rgb - RGB values (0-255)
 * @returns {{l: number, c: number, h: number}} OKLCH values
 */
export function rgbToOklch(rgb) {
    const linear = sRGBToLinearRGB(rgb)
    const lab = linearRGBToOKLab(linear)
    return okLabToOKLCH(lab)
}

/**
 * Convert OKLCH to RGB (with gamut mapping)
 * @param {{l: number, c: number, h: number}} lch - OKLCH values
 * @returns {{r: number, g: number, b: number}} RGB values (0-255)
 */
export function oklchToRgb(lch) {
    const lab = oklchToOKLab(lch)
    const linear = okLabToLinearRGB(lab)
    const clamped = gamutMapLinearRGB(linear, lch)
    return linearRGBToSRGB(clamped)
}

/**
 * Convert OKLCH to RGB without gamut mapping (may be out of range)
 * @param {{l: number, c: number, h: number}} lch - OKLCH values
 * @returns {{r: number, g: number, b: number}} RGB values (may be outside 0-255)
 */
export function oklchToRgbRaw(lch) {
    const lab = oklchToOKLab(lch)
    const linear = okLabToLinearRGB(lab)
    return {
        r: Math.round(linearToSRGB(linear.r) * 255),
        g: Math.round(linearToSRGB(linear.g) * 255),
        b: Math.round(linearToSRGB(linear.b) * 255)
    }
}

// ============================================================================
// Gamut Mapping
// ============================================================================

/**
 * Check if linear RGB values are within sRGB gamut
 * @param {{r: number, g: number, b: number}} linear - Linear RGB values
 * @returns {boolean}
 */
export function isInGamut(linear) {
    const eps = 0.0001
    return linear.r >= -eps && linear.r <= 1 + eps &&
           linear.g >= -eps && linear.g <= 1 + eps &&
           linear.b >= -eps && linear.b <= 1 + eps
}

/**
 * Gamut map linear RGB by reducing chroma while preserving lightness and hue
 * Uses binary search for efficiency
 * @param {{r: number, g: number, b: number}} linear - Linear RGB values (potentially out of gamut)
 * @param {{l: number, c: number, h: number}} originalLch - Original OKLCH values (for hue/lightness reference)
 * @returns {{r: number, g: number, b: number}} Gamut-mapped linear RGB values (0-1)
 */
export function gamutMapLinearRGB(linear, originalLch) {
    // If already in gamut, just clamp minor floating point errors
    if (isInGamut(linear)) {
        return {
            r: Math.max(0, Math.min(1, linear.r)),
            g: Math.max(0, Math.min(1, linear.g)),
            b: Math.max(0, Math.min(1, linear.b))
        }
    }

    // Binary search to find maximum in-gamut chroma
    let lowC = 0
    let highC = originalLch.c
    const epsilon = 0.0001
    const maxIterations = 20

    for (let i = 0; i < maxIterations && (highC - lowC) > epsilon; i++) {
        const midC = (lowC + highC) / 2
        const testLch = { l: originalLch.l, c: midC, h: originalLch.h }
        const testLab = oklchToOKLab(testLch)
        const testLinear = okLabToLinearRGB(testLab)

        if (isInGamut(testLinear)) {
            lowC = midC
        } else {
            highC = midC
        }
    }

    // Convert the gamut-mapped chroma back to linear RGB
    const mappedLch = { l: originalLch.l, c: lowC, h: originalLch.h }
    const mappedLab = oklchToOKLab(mappedLch)
    const mappedLinear = okLabToLinearRGB(mappedLab)

    return {
        r: Math.max(0, Math.min(1, mappedLinear.r)),
        g: Math.max(0, Math.min(1, mappedLinear.g)),
        b: Math.max(0, Math.min(1, mappedLinear.b))
    }
}

/**
 * Get maximum in-gamut chroma for a given lightness and hue
 * @param {number} l - Lightness (0-1)
 * @param {number} h - Hue (0-360)
 * @returns {number} Maximum chroma
 */
export function getMaxChroma(l, h) {
    // Binary search for max chroma
    let lowC = 0
    let highC = 0.5 // OKLCH chroma rarely exceeds 0.4 for sRGB
    const epsilon = 0.001
    const maxIterations = 20

    for (let i = 0; i < maxIterations && (highC - lowC) > epsilon; i++) {
        const midC = (lowC + highC) / 2
        const lab = oklchToOKLab({ l, c: midC, h })
        const linear = okLabToLinearRGB(lab)

        if (isInGamut(linear)) {
            lowC = midC
        } else {
            highC = midC
        }
    }

    return lowC
}

// ============================================================================
// Hex parsing and formatting
// ============================================================================

/**
 * Parse hex color string to RGB
 * @param {string} hex - Hex color string (#RGB, #RRGGBB, with or without #)
 * @returns {{r: number, g: number, b: number}|null} RGB values or null if invalid
 */
export function parseHex(hex) {
    if (!hex || typeof hex !== 'string') return null

    let h = hex.trim()
    if (h.startsWith('#')) h = h.slice(1)

    // Support 3-char shorthand
    if (h.length === 3) {
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    }

    if (h.length !== 6) return null
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null

    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16)
    }
}

/**
 * Format RGB to hex string
 * @param {{r: number, g: number, b: number}} rgb - RGB values (0-255)
 * @returns {string} Hex string (#rrggbb, lowercase)
 */
export function rgbToHex(rgb) {
    const r = Math.max(0, Math.min(255, Math.round(rgb.r)))
    const g = Math.max(0, Math.min(255, Math.round(rgb.g)))
    const b = Math.max(0, Math.min(255, Math.round(rgb.b)))

    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
}

/**
 * Format RGBA to hex string with alpha
 * @param {{r: number, g: number, b: number}} rgb - RGB values (0-255)
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} Hex string (#rrggbbaa, lowercase)
 */
export function rgbToHexWithAlpha(rgb, alpha) {
    const hex = rgbToHex(rgb)
    const a = Math.max(0, Math.min(255, Math.round(alpha * 255)))
    return hex + a.toString(16).padStart(2, '0')
}

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Clamp a value between min and max
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
}

/**
 * Normalize hue to 0-360 range
 * @param {number} h - Hue value
 * @returns {number} Normalized hue (0-360)
 */
export function normalizeHue(h) {
    return ((h % 360) + 360) % 360
}

/**
 * Round to specified decimal places
 * @param {number} value
 * @param {number} decimals
 * @returns {number}
 */
export function roundTo(value, decimals) {
    const factor = Math.pow(10, decimals)
    return Math.round(value * factor) / factor
}
