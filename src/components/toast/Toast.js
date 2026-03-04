/**
 * Toast Notification System
 * Lightweight notification toasts with auto-dismiss
 * @module components/toast/Toast
 */

// Inject styles once
const STYLES_ID = 'hf-toast-styles'
if (!document.getElementById(STYLES_ID)) {
    const style = document.createElement('style')
    style.id = STYLES_ID
    style.textContent = `
        .hf-toast-container {
            position: fixed;
            bottom: 1rem;
            right: 1rem;
            display: flex;
            flex-direction: column-reverse;
            gap: 0.5rem;
            z-index: 10000;
            pointer-events: none;
        }

        .hf-toast {
            display: flex;
            align-items: flex-start;
            gap: 0.75em;
            padding: 0.75em 1em;
            min-width: 240px;
            max-width: 400px;
            background: color-mix(
                in srgb,
                var(--hf-bg-surface, #1a1e2e) 95%,
                transparent 5%
            );
            backdrop-filter: blur(12px);
            border: 1px solid var(--hf-bg-elevated);
            border-radius: var(--hf-radius-sm, 4px);
            box-shadow: var(--hf-shadow-md, 0 4px 8px rgba(0, 0, 0, 0.2));
            color: var(--hf-text-normal);
            font-size: 0.875rem;
            pointer-events: auto;
            opacity: 0;
            transform: translateX(100%);
            transition: opacity 0.2s ease, transform 0.2s ease;
            margin: 2px;
        }

        .hf-toast.show {
            opacity: 1;
            transform: translateX(0);
        }

        .hf-toast.hide {
            opacity: 0;
            transform: translateX(100%);
        }

        .hf-toast-icon {
            flex-shrink: 0;
            font-size: 1.125rem;
            line-height: 1;
        }

        .hf-toast-content {
            flex: 1;
            min-width: 0;
        }

        .hf-toast-message {
            margin: 0;
            line-height: 1.4;
            word-wrap: break-word;
        }

        .hf-toast-close {
            flex-shrink: 0;
            background: none;
            border: none;
            color: var(--hf-text-dim);
            cursor: pointer;
            font-size: var(--hf-size-md, 1rem);
            line-height: 1;
            padding: 0;
            opacity: 0.6;
            transition: opacity 0.15s ease;
        }

        .hf-toast-close:hover {
            opacity: 1;
        }

        /* Toast types */
        .hf-toast.hf-toast-success {
            border-color: color-mix(in srgb, var(--hf-green, #58db63) 30%, transparent 70%);
        }
        .hf-toast.hf-toast-success .hf-toast-icon {
            color: var(--hf-green, #58db63);
        }

        .hf-toast.hf-toast-error {
            border-color: color-mix(in srgb, var(--hf-red, #ff5b6b) 30%, transparent 70%);
        }
        .hf-toast.hf-toast-error .hf-toast-icon {
            color: var(--hf-red, #ff5b6b);
        }

        .hf-toast.hf-toast-warning {
            border-color: color-mix(in srgb, var(--hf-yellow, #ffd66b) 30%, transparent 70%);
        }
        .hf-toast.hf-toast-warning .hf-toast-icon {
            color: var(--hf-yellow, #ffd66b);
        }

        .hf-toast.hf-toast-info {
            border-color: color-mix(in srgb, var(--hf-accent, #a5b8ff) 30%, transparent 70%);
        }
        .hf-toast.hf-toast-info .hf-toast-icon {
            color: var(--hf-accent, #a5b8ff);
        }

        /* Progress bar for auto-dismiss */
        .hf-toast-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--hf-bg-muted);
            border-radius: 0 0 var(--hf-radius, 8px) var(--hf-radius, 8px);
            overflow: hidden;
        }

        .hf-toast-progress-bar {
            height: 100%;
            background: var(--hf-accent);
            transition: width linear;
        }

        .hf-toast.hf-toast-success .hf-toast-progress-bar {
            background: var(--hf-green, #58db63);
        }

        .hf-toast.hf-toast-error .hf-toast-progress-bar {
            background: var(--hf-red, #ff5b6b);
        }

        .hf-toast.hf-toast-warning .hf-toast-progress-bar {
            background: var(--hf-yellow, #ffd66b);
        }
    `
    document.head.appendChild(style)
}

// Icon mapping for toast types
const ICONS = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
}

/**
 * Get or create the toast container
 * @returns {HTMLElement}
 */
function getContainer() {
    let container = document.querySelector('.hf-toast-container')
    if (!container) {
        container = document.createElement('div')
        container.className = 'hf-toast-container'
        document.body.appendChild(container)
    }
    return container
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {Object} options
 * @param {'success'|'error'|'warning'|'info'} [options.type='info'] - Toast type
 * @param {number} [options.duration=2000] - Duration in ms (0 = no auto-dismiss)
 * @param {boolean} [options.dismissible=true] - Show close button
 * @param {boolean} [options.showProgress=false] - Show progress bar for auto-dismiss
 * @returns {Object} Toast controller with dismiss() method
 */
function showToast(message, options = {}) {
    const {
        type = 'info',
        duration = 2000,
        dismissible = true,
        showProgress = false
    } = options

    const container = getContainer()

    // Create toast element
    const toast = document.createElement('div')
    toast.className = `hf-toast hf-toast-${type}`
    toast.setAttribute('role', 'alert')
    toast.setAttribute('aria-live', 'polite')

    const icon = ICONS[type] || ICONS.info

    toast.innerHTML = `
        <span class="hf-toast-icon" aria-hidden="true">${icon}</span>
        <div class="hf-toast-content">
            <p class="hf-toast-message">${message}</p>
        </div>
        ${dismissible ? '<button class="hf-toast-close" aria-label="Dismiss">✕</button>' : ''}
        ${duration > 0 && showProgress ? `
            <div class="hf-toast-progress">
                <div class="hf-toast-progress-bar" style="width: 100%"></div>
            </div>
        ` : ''}
    `

    // Add to container
    container.appendChild(toast)

    // Animation timeline
    let dismissTimeout = null
    let progressBar = toast.querySelector('.hf-toast-progress-bar')

    const dismiss = () => {
        if (dismissTimeout) {
            clearTimeout(dismissTimeout)
            dismissTimeout = null
        }

        toast.classList.add('hide')
        toast.addEventListener('transitionend', () => {
            toast.remove()
        }, { once: true })
    }

    // Trigger show animation
    requestAnimationFrame(() => {
        toast.classList.add('show')

        // Start progress bar animation
        if (duration > 0 && progressBar) {
            progressBar.style.transitionDuration = `${duration}ms`
            requestAnimationFrame(() => {
                progressBar.style.width = '0%'
            })
        }
    })

    // Close button handler
    if (dismissible) {
        const closeBtn = toast.querySelector('.hf-toast-close')
        closeBtn.addEventListener('click', dismiss)
    }

    // Auto-dismiss
    if (duration > 0) {
        dismissTimeout = setTimeout(dismiss, duration)

        // Pause on hover
        toast.addEventListener('mouseenter', () => {
            if (dismissTimeout) {
                clearTimeout(dismissTimeout)
                dismissTimeout = null
            }
            if (progressBar) {
                progressBar.style.transitionDuration = '0s'
            }
        })

        toast.addEventListener('mouseleave', () => {
            if (!toast.classList.contains('hide')) {
                // Get remaining progress
                const remaining = progressBar
                    ? parseFloat(getComputedStyle(progressBar).width) / parseFloat(getComputedStyle(progressBar.parentElement).width)
                    : 0.5
                const remainingTime = duration * remaining

                if (progressBar) {
                    progressBar.style.transitionDuration = `${remainingTime}ms`
                    requestAnimationFrame(() => {
                        progressBar.style.width = '0%'
                    })
                }

                dismissTimeout = setTimeout(dismiss, remainingTime)
            }
        })
    }

    return { dismiss }
}

/**
 * Show a success toast
 * @param {string} message
 * @param {Object} options
 */
function showSuccess(message, options = {}) {
    return showToast(message, { ...options, type: 'success' })
}

/**
 * Show an error toast
 * @param {string} message
 * @param {Object} options
 */
function showError(message, options = {}) {
    return showToast(message, { ...options, type: 'error', duration: options.duration ?? 6000 })
}

/**
 * Show a warning toast
 * @param {string} message
 * @param {Object} options
 */
function showWarning(message, options = {}) {
    return showToast(message, { ...options, type: 'warning' })
}

/**
 * Show an info toast
 * @param {string} message
 * @param {Object} options
 */
function showInfo(message, options = {}) {
    return showToast(message, { ...options, type: 'info' })
}

export {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
}
