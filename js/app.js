import { addBox, getState } from './state.js';
import { loadFromLocalStorage } from './storage.js';
import { renderGrid } from './grid/grid.js';
import { initUI } from './ui/controls.js';

function init() {
    console.log("Initializing Rytmeboks App...");
    
    // Try to load from localStorage first
    const hasSavedData = loadFromLocalStorage();
    
    if (!hasSavedData || !getState().boxes || getState().boxes.length === 0) {
        // Initialize with default box if no saved data
        addBox();
    }
    
    initUI();
    renderGrid();
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
