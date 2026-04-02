/**
 * Handfish Design System
 *
 * A collection of UI components and styles for Noisemaker-based applications.
 *
 * @module handfish
 */

// Utilities
export * from './utils/colorConversions.js'
export { initializeTooltips } from './utils/tooltips.js'
export { registerEscapeable, unregisterEscapeable, closeTopmost, hasOpenEscapeables, initEscapeHandler } from './utils/escapeHandler.js'

// Existing components
export { ToggleSwitch } from './components/toggle-switch/ToggleSwitch.js'
export { SliderValue } from './components/slider-value/SliderValue.js'
export { SelectDropdown } from './components/select-dropdown/SelectDropdown.js'
export { ColorWheel } from './components/color-wheel/ColorWheel.js'
export { ColorPicker } from './components/color-picker/ColorPicker.js'
export { JustifyButtonGroup } from './components/justify-button-group/JustifyButtonGroup.js'

// New components
export { showToast, showSuccess, showError, showWarning, showInfo } from './components/toast/Toast.js'
export { DropdownMenu, DropdownItem } from './components/dropdown-menu/DropdownMenu.js'
export { ColorSwatch } from './components/color-swatch/ColorSwatch.js'
export { GradientStops } from './components/gradient-stops/GradientStops.js'
export { ImageMagnifier } from './components/image-magnifier/ImageMagnifier.js'
export { Vector3dPicker } from './components/vector3d-picker/Vector3dPicker.js'
export { Vector2dPicker } from './components/vector2d-picker/Vector2dPicker.js'
export { CodeEditor } from './components/code-editor/CodeEditor.js'
export { EDITOR_THEMES, THEME_KEYS, applyEditorTheme, applyEditorThemeGlobal } from './components/code-editor/codeEditorThemes.js'
export { dslTokenizer } from './components/code-editor/tokenizers/dsl.js'
export { AboutDialog } from './components/about-dialog/AboutDialog.js'
