import { addBox, getState, setGuitarChords } from './state.js';
import { loadFromLocalStorage } from './storage.js';
import { renderGrid } from './grid/grid.js';
import { initUI } from './ui/controls.js';

async function loadGuitarChords() {
    try {
        const response = await fetch('./js/data/guitarChords.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setGuitarChords(data);
    } catch (error) {
        console.error("Failed to load guitar chords:", error);
    }
}

async function init() {
    console.log("Initializing Rytmeboks App...");
    
    // Load guitar chords data first
    await loadGuitarChords();
    
    // Try to load from localStorage first
    const hasSavedData = loadFromLocalStorage();
    
    if (!hasSavedData || !getState().boxes || getState().boxes.length === 0) {
        // Initialize with default boxes if no saved data
        for (let i = 0; i < 4; i++) {
            addBox();
        }
    }
    
    initUI();
    renderGrid();
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
