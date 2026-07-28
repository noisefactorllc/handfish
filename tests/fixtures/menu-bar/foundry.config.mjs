// Parity fixture: Foundry's menu bar expressed as a <menu-bar> config.
// Transcribed from public/index.html:80-134 + app.js setupMenuBar()/
// updateMenuFilename()/updateUndoRedoButtons()/updateOverlayToggleStates().

export default function foundryConfig() {
    window.__parity = {
        calls: [],
        state: {
            paramsShown: false,
            dslShown: true,          // editor visible by default in Foundry
            docsShown: true,         // doc reader open by default
            filename: 'untitled',
            editorVisible: true,
            canUndo: false,
            canRedo: false,
            playing: true,
        },
    }
    const s = window.__parity.state
    const act = id => () => window.__parity.calls.push(id)

    return {
        ariaLabel: 'Foundry menu',
        regions: {
            left: [
                {
                    type: 'menu',
                    id: 'logoMenu',
                    trigger: { html: '<svg id="logo" width="1.5em" height="1.5em" viewBox="0 0 600 600" fill="currentColor"><path d="M0 0h600v600H0z"/></svg>', ariaLabel: 'Foundry menu' },
                    items: [
                        { id: 'aboutMenuItem', label: 'about Foundry', onSelect: act('aboutMenuItem') },
                    ],
                },
                {
                    type: 'menu',
                    id: 'fileMenu',
                    trigger: { label: 'file' },
                    items: [
                        { id: 'newEffectMenuItem', label: 'new effect...', onSelect: act('newEffectMenuItem') },
                        { id: 'newFileMenuItem', label: 'new file...', onSelect: act('newFileMenuItem') },
                        { type: 'separator' },
                        { id: 'workspaceFilesMenuItem', label: 'workspace files', onSelect: act('workspaceFilesMenuItem') },
                        { id: 'saveEffectMenuItem', label: 'save effect workspace...', onSelect: act('saveEffectMenuItem') },
                        { id: 'deleteEffectMenuItem', label: 'delete effect workspace...', onSelect: act('deleteEffectMenuItem') },
                        { id: 'downloadWorkspaceMenuItem', label: 'export effect to zip', onSelect: act('downloadWorkspaceMenuItem') },
                        { type: 'separator' },
                        { id: 'importFromLibraryMenuItem', label: 'import effect from library...', onSelect: act('importFromLibraryMenuItem') },
                        { id: 'importFromZipMenuItem', label: 'import effect from zip...', onSelect: act('importFromZipMenuItem') },
                    ],
                },
                {
                    type: 'menu',
                    id: 'effectMenu',
                    trigger: { label: 'effect' },
                    items: [
                        { id: 'showParametersMenuItem', label: 'show parameters', onSelect: () => { s.paramsShown = !s.paramsShown; window.__parity.calls.push('showParametersMenuItem') } },
                        { id: 'showDslMenuItem', label: 'show dsl code', onSelect: () => { s.dslShown = !s.dslShown; window.__parity.calls.push('showDslMenuItem') } },
                        { type: 'separator' },
                        { id: 'editInNoisedeckMenuItem', label: 'edit in Noisedeck...', onSelect: act('editInNoisedeckMenuItem') },
                        { id: 'editInNoodlesMenuItem', label: 'edit in Noodles...', onSelect: act('editInNoodlesMenuItem') },
                        { id: 'editInPolymorphicMenuItem', label: 'edit in Polymorphic...', onSelect: act('editInPolymorphicMenuItem') },
                        { id: 'editInShadeMenuItem', label: 'edit in Shade...', onSelect: act('editInShadeMenuItem') },
                        { type: 'separator' },
                        { id: 'importFromUrlMenuItem', label: 'import from url...', onSelect: act('importFromUrlMenuItem') },
                        { id: 'sharePubliclyMenuItem', label: 'share publicly...', onSelect: act('sharePubliclyMenuItem') },
                    ],
                },
            ],
            center: [
                {
                    type: 'label',
                    id: 'menuFilename',
                    text: () => s.editorVisible ? (s.filename || 'dsl.txt') : '',
                    interactive: () => s.editorVisible,
                    onSelect: act('menuFilename'),
                },
            ],
            right: [
                { type: 'button', id: 'undo-btn', icon: 'undo', tooltip: 'Undo (Cmd+Z)', ariaLabel: 'Undo', disabled: () => !s.canUndo, onSelect: act('undo-btn') },
                { type: 'button', id: 'redo-btn', icon: 'redo', tooltip: 'Redo (Cmd+Shift+Z)', ariaLabel: 'Redo', disabled: () => !s.canRedo, onSelect: act('redo-btn') },
                { type: 'button', id: 'doc-toggle-btn', icon: 'info', tooltip: 'Documentation', ariaLabel: 'Toggle documentation', active: () => s.docsShown, onSelect: () => { s.docsShown = !s.docsShown; window.__parity.calls.push('doc-toggle-btn') } },
                { type: 'button', id: 'toggle-dsl-overlay', icon: 'code', tooltip: 'Show DSL', ariaLabel: 'Toggle DSL code', active: () => s.dslShown, onSelect: () => { s.dslShown = !s.dslShown; window.__parity.calls.push('toggle-dsl-overlay') } },
                { type: 'button', id: 'play-pause-btn', icon: () => s.playing ? 'pause' : 'play_arrow', tooltip: () => s.playing ? 'Pause' : 'Play', ariaLabel: 'Play/Pause', onSelect: () => { s.playing = !s.playing; window.__parity.calls.push('play-pause-btn') } },
            ],
        },
    }
}
