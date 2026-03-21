import { getState, setMode, setTimeSignature, addBox, setGlobalRows, resetState, setLayout } from '../state.js';
import { renderGrid } from '../grid/grid.js';
import { saveToLocalStorage, exportToJSON, importFromJSON } from '../storage.js';

export function initUI() {
    const state = getState();
    
    // Mode Buttons
    const modeBtns = document.querySelectorAll('#mode-selector button');
    modeBtns.forEach(btn => {
        if (btn.dataset.mode === state.mode) {
            btn.classList.add('active');
        }
        
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setMode(btn.dataset.mode);
        });
    });

    // Time Signature Buttons
    const sigBtns = document.querySelectorAll('#time-selector button');
    sigBtns.forEach(btn => {
        if (btn.dataset.sig === state.timeSignature) {
            btn.classList.add('active');
        }
        
        btn.addEventListener('click', () => {
            sigBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setTimeSignature(btn.dataset.sig);
            saveToLocalStorage();
        });
    });

    // Global Rows Input
    const rowsInput = document.getElementById('global-rows-input');
    rowsInput.value = state.globalRows;
    rowsInput.addEventListener('change', (e) => {
        const rows = parseInt(e.target.value);
        setGlobalRows(rows);
        saveToLocalStorage();
    });

    // Reset Button (Double-click pattern to avoid confirm() in iframe)
    let resetTimer = null;
    const resetBtn = document.getElementById('btn-reset');
    resetBtn.addEventListener('click', () => {
        if (resetBtn.dataset.confirm === 'true') {
            resetState();
            saveToLocalStorage();
            resetBtn.textContent = 'Nulstil';
            resetBtn.dataset.confirm = 'false';
            resetBtn.classList.remove('bg-red-800');
            resetBtn.classList.add('bg-red-600');
            clearTimeout(resetTimer);
        } else {
            resetBtn.textContent = 'Er du sikker?';
            resetBtn.dataset.confirm = 'true';
            resetBtn.classList.remove('bg-red-600');
            resetBtn.classList.add('bg-red-800');
            
            resetTimer = setTimeout(() => {
                resetBtn.textContent = 'Nulstil';
                resetBtn.dataset.confirm = 'false';
                resetBtn.classList.remove('bg-red-800');
                resetBtn.classList.add('bg-red-600');
            }, 3000);
        }
    });

    // Print Button
    document.getElementById('btn-print').addEventListener('click', () => {
        // Try to print, if it fails or does nothing, suggest opening in new tab
        try {
            window.print();
        } catch (e) {
            console.error('Print failed:', e);
            alert('Print er blokeret i denne visning. Prøv at åbne appen i et nyt vindue.');
        }
    });

    // Export/Import
    document.getElementById('btn-export').addEventListener('click', exportToJSON);
    
    const fileInput = document.getElementById('file-input');
    document.getElementById('btn-import').addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            await importFromJSON(e.target.files[0]);
            location.reload();
        }
    });

    // Layout Toggle
    const layoutBtn = document.getElementById('btn-toggle-layout');
    layoutBtn.textContent = state.layout === 'grid' ? '📄' : '🔲';
    layoutBtn.addEventListener('click', () => {
        const currentLayout = getState().layout;
        const newLayout = currentLayout === 'grid' ? 'column' : 'grid';
        setLayout(newLayout);
        saveToLocalStorage();
    });

    // Listen for state changes to re-render grid and update UI
    window.addEventListener('statechange', (e) => {
        const newState = e.detail;
        
        // Update mode buttons
        modeBtns.forEach(btn => {
            if (btn.dataset.mode === newState.mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update time signature buttons
        sigBtns.forEach(btn => {
            if (btn.dataset.sig === newState.timeSignature) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update rows input
        rowsInput.value = newState.globalRows;
        
        // Update layout button icon
        layoutBtn.textContent = newState.layout === 'grid' ? '📄' : '🔲';

        // Use setTimeout to allow browser to process focus transitions before re-rendering
        setTimeout(() => {
            renderGrid();
        }, 0);
    });
}
