/**
 * Tooltip System
 * 
 * Provides hover tooltips for elements with .tooltip class.
 * Reads tooltip text from data-title or aria-label attributes.
 *
 * @module utils/tooltips
 */

const TOOLTIP_MARGIN = 12

const TOOLTIP_STYLES_ID = 'hf-tooltip-styles'
if (typeof document !== 'undefined' && !document.getElementById(TOOLTIP_STYLES_ID)) {
    const style = document.createElement('style')
    style.id = TOOLTIP_STYLES_ID
    style.textContent = `
        #hf-tooltip-layer {
            position: fixed;
            z-index: 100000;
            padding: 0.375rem 0.625rem;
            font-family: var(--hf-font-family, Nunito, system-ui, sans-serif);
            font-size: var(--hf-size-xs, 0.625rem);
            color: var(--hf-text-bright, #eef1f8);
            background: var(--hf-bg-surface, #1a1e2e);
            border: 1px solid var(--hf-border, rgba(255, 255, 255, 0.08));
            border-radius: var(--hf-radius-sm, 0.375rem);
            pointer-events: none;
            white-space: nowrap;
            transform: translateX(-50%);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        #hf-tooltip-layer[data-position="above"] {
            transform: translateX(-50%) translateY(-100%);
        }
    `
    document.head.appendChild(style)
}

let tooltipElement = null
let activeTarget = null
let initialized = false

function ensureTooltipElement() {
    if (tooltipElement || typeof document === 'undefined') { return tooltipElement }

    const element = document.createElement('div')
    element.id = 'hf-tooltip-layer'
    element.setAttribute('role', 'tooltip')
    element.setAttribute('hidden', '')
    element.setAttribute('aria-hidden', 'true')
    document.body.appendChild(element)
    tooltipElement = element
    return tooltipElement
}

function getTooltipMessage(target) {
    if (!target) { return '' }

    const dataTitle = target.getAttribute('data-title')
    if (typeof dataTitle === 'string' && dataTitle.trim().length > 0) {
        return dataTitle.trim()
    }

    const ariaLabel = target.getAttribute('aria-label')
    if (typeof ariaLabel === 'string' && ariaLabel.trim().length > 0) {
        return ariaLabel.trim()
    }

    return ''
}

function updateTooltipPosition() {
    if (!tooltipElement || !activeTarget) { return }
    if (!document.body.contains(activeTarget)) {
        hideTooltip()
        return
    }

    const rect = activeTarget.getBoundingClientRect()
    const tooltipWidth = tooltipElement.offsetWidth
    const tooltipHeight = tooltipElement.offsetHeight
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth
    const viewportHeight = window.innerHeight

    const halfWidth = tooltipWidth / 2
    let centerX = rect.left + (rect.width / 2)
    centerX = Math.min(Math.max(centerX, TOOLTIP_MARGIN + halfWidth), viewportWidth - TOOLTIP_MARGIN - halfWidth)

    let top = rect.bottom + TOOLTIP_MARGIN
    let position = 'below'
    const fitsAbove = (rect.top - TOOLTIP_MARGIN - tooltipHeight) >= TOOLTIP_MARGIN

    if ((top + tooltipHeight > viewportHeight) && fitsAbove) {
        position = 'above'
        top = rect.top - TOOLTIP_MARGIN
    }

    if (position === 'below') {
        const maxTop = viewportHeight - TOOLTIP_MARGIN - tooltipHeight
        top = Math.min(top, maxTop)
        top = Math.max(top, TOOLTIP_MARGIN)
    } else {
        const minTop = TOOLTIP_MARGIN + tooltipHeight
        top = Math.max(top, minTop)
        top = Math.min(top, viewportHeight - TOOLTIP_MARGIN)
    }

    tooltipElement.style.left = `${centerX}px`
    tooltipElement.style.top = `${top}px`
    tooltipElement.dataset.position = position
}

function showTooltip(target) {
    const message = getTooltipMessage(target)
    if (!message) {
        hideTooltip()
        return
    }

    const element = ensureTooltipElement()
    if (!element) { return }

    activeTarget = target
    element.textContent = message
    element.dataset.position = 'below'
    element.dataset.visible = 'true'
    element.setAttribute('aria-hidden', 'false')
    element.style.visibility = 'hidden'
    element.removeAttribute('hidden')

    updateTooltipPosition()

    element.style.visibility = 'visible'
}

function hideTooltip(target) {
    if (target && target !== activeTarget) { return }
    if (!tooltipElement) { return }

    tooltipElement.setAttribute('aria-hidden', 'true')
    tooltipElement.removeAttribute('data-visible')
    tooltipElement.removeAttribute('data-position')
    tooltipElement.textContent = ''
    tooltipElement.style.visibility = 'hidden'
    tooltipElement.setAttribute('hidden', '')
    activeTarget = null
}

function handlePointerOver(event) {
    const target = event.target instanceof Element ? event.target.closest('.tooltip') : null
    if (!target) { return }

    if (target === activeTarget) {
        updateTooltipPosition()
        return
    }

    showTooltip(target)
}

function handlePointerOut(event) {
    if (!activeTarget) { return }

    const current = event.target instanceof Element ? event.target.closest('.tooltip') : null
    if (current !== activeTarget) { return }

    const related = event.relatedTarget
    if (related && activeTarget.contains(related)) { return }

    hideTooltip(activeTarget)
}

function handlePointerDown(event) {
    if (!activeTarget) { return }
    if (event.target instanceof Element && activeTarget.contains(event.target)) { return }
    hideTooltip()
}

function handleFocusIn(event) {
    const target = event.target instanceof Element ? event.target.closest('.tooltip') : null
    if (!target) { return }
    showTooltip(target)
}

function handleFocusOut(event) {
    if (!activeTarget) { return }
    const target = event.target instanceof Element ? event.target.closest('.tooltip') : null
    if (target !== activeTarget) { return }
    hideTooltip(activeTarget)
}

function handleViewportChange() {
    if (!activeTarget || !tooltipElement || tooltipElement.hasAttribute('hidden')) { return }
    updateTooltipPosition()
}

/**
 * Initialize the tooltip system
 * Call this once when your app starts to enable tooltips
 */
export function initializeTooltips() {
    if (initialized || typeof document === 'undefined') { return }

    initialized = true
    ensureTooltipElement()

    document.addEventListener('pointerover', handlePointerOver, true)
    document.addEventListener('pointerout', handlePointerOut, true)
    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('focusin', handleFocusIn, true)
    document.addEventListener('focusout', handleFocusOut, true)
    window.addEventListener('scroll', handleViewportChange, true)
    window.addEventListener('resize', handleViewportChange, true)
}
