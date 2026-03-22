import { getState, setState } from './state.js';

const STORAGE_KEY = 'notation_app_data';

export function saveToLocalStorage() {
    const state = getState();
    const dataToSave = { ...state };
    delete dataToSave.guitarChords;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
}

export function loadFromLocalStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            const currentState = getState();
            
            // Ensure we never load guitarChords from localStorage, 
            // always use the ones loaded from the server
            if (data.guitarChords) {
                delete data.guitarChords;
            }
            
            const mergedData = { ...currentState, ...data };
            setState(mergedData, true);
            return true;
        } catch (e) {
            console.error("Failed to parse saved data", e);
        }
    }
    return false;
}

export function exportToJSON() {
    const state = getState();
    // Create a clean copy for export
    const dataToExport = {
        title: state.title,
        mode: state.mode,
        timeSignature: state.timeSignature,
        globalRows: state.globalRows,
        layout: state.layout,
        boxes: state.boxes,
        repeats: state.repeats,
        instrument: state.instrument,
        songTitle: state.songTitle,
        artist: state.artist
    };
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const filenameParts = [];
    if (state.songTitle) filenameParts.push(state.songTitle);
    if (state.instrument) filenameParts.push(state.instrument);
    
    const filename = filenameParts.length > 0 
        ? filenameParts.join(' - ') 
        : (state.title || "Rytmeboks");
    
    const exportFileDefaultName = `${filename.replace(/[\\/:*?"<>|]/g, '_')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

export function importFromJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (!importedData || typeof importedData !== 'object') {
                    throw new Error("Ugyldig JSON fil.");
                }

                // Handle both full state object and just boxes array
                let boxes = importedData.boxes;
                if (!boxes && Array.isArray(importedData)) {
                    boxes = importedData;
                }

                if (!Array.isArray(boxes)) {
                    throw new Error("Ugyldigt filformat: Mangler rytmebokse.");
                }

                // Sanitize boxes to ensure they have all required fields for rendering
                const sanitizedBoxes = boxes.map(box => {
                    const rows = box.rows || 1;
                    const cols = box.cols || 8;
                    
                    // Ensure gridData exists and has correct dimensions
                    let gridData = box.gridData;
                    if (!Array.isArray(gridData)) {
                        gridData = Array(rows).fill(0).map(() => 
                            Array(cols).fill(0).map(() => ({ text: "", inversion: 0, active: false }))
                        );
                    }

                    // Ensure markers exist
                    let markers = box.markers;
                    if (!Array.isArray(markers)) {
                        markers = Array(rows).fill(0).map(() => ({ left: "", right: "" }));
                    }

                    // Ensure drumLabels exist
                    let drumLabels = box.drumLabels;
                    if (!Array.isArray(drumLabels)) {
                        drumLabels = ["Stortromme", "Lilletromme", "Hi-hat", "Tom 1", "Tom 2", "Cymbal", "Perc 1", "Perc 2", "Perc 3", "Perc 4", "Perc 5", "Perc 6"].slice(0, rows);
                    }

                    return {
                        id: box.id || crypto.randomUUID(),
                        formled: box.formled || "",
                        rows: rows,
                        cols: cols,
                        gridData: gridData,
                        markers: markers,
                        hidden: !!box.hidden,
                        drumLabels: drumLabels
                    };
                });

                // Construct a clean state from imported data + current defaults
                const currentState = getState();
                const newState = {
                    ...currentState,
                    title: importedData.title || currentState.title,
                    mode: importedData.mode || currentState.mode,
                    timeSignature: importedData.timeSignature || currentState.timeSignature,
                    globalRows: importedData.globalRows || currentState.globalRows,
                    layout: importedData.layout || currentState.layout,
                    instrument: importedData.instrument || currentState.instrument,
                    songTitle: importedData.songTitle || currentState.songTitle,
                    artist: importedData.artist || currentState.artist,
                    boxes: sanitizedBoxes,
                    repeats: Array.isArray(importedData.repeats) ? importedData.repeats : [],
                    // NEVER import guitarChords, always keep the ones loaded from the server
                    guitarChords: currentState.guitarChords,
                    activeField: null,
                    repeatSelection: null
                };

                setState(newState);
                saveToLocalStorage();
                resolve(newState);
            } catch (err) {
                console.error("Import failed:", err);
                alert("Kunne ikke importere filen: " + err.message);
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}
