export const initialState = {
    title: "Rytmeboks",
    mode: "normal", // normal, drum, guitar
    timeSignature: "4/4", // 4/4, 4/4+, 3/4, 3/4+, 6/8
    globalRows: 1,
    layout: "column", // column, grid
    boxes: [], // Array of { id, formled, rows, cols, gridData, markers, drumLabels }
    repeats: [], // Array of { id, startBoxId, endBoxId, count }
    repeatSelection: null, // { startBoxId }
    activeField: null, // { type: 'cell'|'header'|'formled'|'drumLabel', ... }
    instrument: "",
    songTitle: "",
    artist: ""
};

let state = { ...initialState };

export function getState() {
    return state;
}

export function setState(newState, skipEvent = false) {
    state = { ...state, ...newState };
    if (!skipEvent) {
        window.dispatchEvent(new CustomEvent('statechange', { detail: state }));
    }
}

export function resetState() {
    const freshState = { ...initialState };
    // Add one initial box
    const cols = getColsForSig(freshState.timeSignature);
    freshState.boxes = [createNewBox(freshState.globalRows, cols)];
    setState(freshState);
}

export function setActiveField(activeField) {
    state.activeField = activeField;
}

export function createNewBox(rows = 1, cols = 8) {
    const id = crypto.randomUUID();
    const gridData = [];
    const markers = [];
    const drumLabels = ["Stortromme", "Lilletromme", "Hi-hat", "Tom 1", "Tom 2", "Cymbal", "Perc 1", "Perc 2", "Perc 3", "Perc 4", "Perc 5", "Perc 6"];
    
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            row.push({ text: "", inversion: 0, active: false });
        }
        gridData.push(row);
        markers.push({ left: "", right: "" });
    }
    
    return {
        id,
        formled: "",
        rows,
        cols,
        gridData,
        markers,
        hidden: false,
        drumLabels: drumLabels.slice(0, rows)
    };
}

export function getColsForSig(sig) {
    switch(sig) {
        case "4/4": return 4;
        case "4/4+": return 8;
        case "3/4": return 3;
        case "3/4+": return 6;
        case "6/8": return 6;
        default: return 8;
    }
}

export function addBox(index = -1) {
    const cols = getColsForSig(state.timeSignature);
    const newBox = createNewBox(state.globalRows, cols);
    
    let boxes = [...state.boxes];
    if (index === -1) {
        boxes.push(newBox);
    } else {
        boxes.splice(index, 0, newBox);
    }
    setState({ boxes });
}

export function removeBox(id) {
    const boxes = state.boxes.filter(b => b.id !== id);
    setState({ boxes });
}

export function setGlobalRows(rows) {
    const newBoxes = state.boxes.map(box => {
        const gridData = [...box.gridData];
        const markers = [...box.markers];
        const drumLabels = [...box.drumLabels];
        
        if (rows > box.rows) {
            const defaultDrumLabels = ["Stortromme", "Lilletromme", "Hi-hat", "Tom 1", "Tom 2", "Cymbal", "Perc 1", "Perc 2", "Perc 3", "Perc 4", "Perc 5", "Perc 6"];
            for (let i = box.rows; i < rows; i++) {
                gridData.push(Array(box.cols).fill(null).map(() => ({ text: "", inversion: 0, active: false })));
                markers.push({ left: "", right: "" });
                const label = state.mode === 'drum' ? (defaultDrumLabels[i] || `Instrument ${i+1}`) : `Instrument ${i+1}`;
                drumLabels.push(label);
            }
        } else {
            gridData.length = rows;
            markers.length = rows;
            drumLabels.length = rows;
        }
        return { ...box, rows, gridData, markers, drumLabels };
    });
    setState({ globalRows: rows, boxes: newBoxes });
}

export function updateBox(id, updates, skipEvent = false) {
    const boxes = state.boxes.map(b => b.id === id ? { ...b, ...updates } : b);
    setState({ boxes }, skipEvent);
}

export function updateCell(boxId, r, c, data, skipEvent = false) {
    const boxes = state.boxes.map(b => {
        if (b.id === boxId) {
            const gridData = b.gridData.map((row, rowIndex) => {
                if (rowIndex === r) {
                    const newRow = [...row];
                    newRow[c] = { ...newRow[c], ...data };
                    return newRow;
                }
                return row;
            });
            return { ...b, gridData };
        }
        return b;
    });
    setState({ boxes }, skipEvent);
}

export function updateMarker(boxId, r, side, text, skipEvent = false) {
    const boxes = state.boxes.map(b => {
        if (b.id === boxId) {
            const markers = b.markers.map((m, rowIndex) => {
                if (rowIndex === r) {
                    return { ...m, [side]: text };
                }
                return m;
            });
            return { ...b, markers };
        }
        return b;
    });
    setState({ boxes }, skipEvent);
}

export function setMode(mode) {
    if (mode === 'drum') {
        const defaultDrumLabels = ["Stortromme", "Lilletromme", "Hi-hat", "Tom 1", "Tom 2", "Cymbal", "Perc 1", "Perc 2", "Perc 3", "Perc 4", "Perc 5", "Perc 6"];
        const newBoxes = state.boxes.map(box => {
            const drumLabels = [...box.drumLabels];
            // Ensure we have enough labels for the rows
            while (drumLabels.length < box.rows) {
                drumLabels.push(`Instrument ${drumLabels.length + 1}`);
            }
            for (let i = 0; i < box.rows; i++) {
                // Only update if it's the generic "Instrument X" label or empty
                if (!drumLabels[i] || drumLabels[i].startsWith('Instrument ')) {
                    drumLabels[i] = defaultDrumLabels[i] || `Instrument ${i+1}`;
                }
            }
            return { ...box, drumLabels };
        });
        
        // Update mode first so setGlobalRows knows we are in drum mode
        setState({ mode, boxes: newBoxes });
        
        if (state.globalRows === 1) {
            setGlobalRows(3);
        }
    } else {
        setState({ mode });
    }
}

export function setTimeSignature(sig) {
    const cols = getColsForSig(sig);
    const boxes = state.boxes.map(b => {
        const newGridData = b.gridData.map(row => {
            const newRow = [...row];
            if (newRow.length < cols) {
                while (newRow.length < cols) newRow.push({ text: "", inversion: 0, active: false });
            } else {
                newRow.length = cols;
            }
            return newRow;
        });
        return { ...b, cols, gridData: newGridData };
    });
    setState({ timeSignature: sig, boxes });
}

export function setLayout(layout) {
    setState({ layout });
}

export function startRepeatSelection(startBoxId) {
    setState({ repeatSelection: { startBoxId } });
}

export function cancelRepeatSelection() {
    setState({ repeatSelection: null });
}

export function completeRepeatSelection(endBoxId) {
    const { repeatSelection, repeats, boxes } = state;
    if (!repeatSelection) return;

    const startIndex = boxes.findIndex(b => b.id === repeatSelection.startBoxId);
    const endIndex = boxes.findIndex(b => b.id === endBoxId);

    if (startIndex === -1 || endIndex === -1) return;

    // Swap if end is before start
    const actualStartId = startIndex <= endIndex ? repeatSelection.startBoxId : endBoxId;
    const actualEndId = startIndex <= endIndex ? endBoxId : repeatSelection.startBoxId;

    const newRepeat = {
        id: crypto.randomUUID(),
        startBoxId: actualStartId,
        endBoxId: actualEndId,
        count: "x2"
    };

    setState({ 
        repeats: [...repeats, newRepeat],
        repeatSelection: null 
    });
}

export function updateRepeat(id, updates) {
    const repeats = state.repeats.map(r => r.id === id ? { ...r, ...updates } : r);
    setState({ repeats });
}

export function removeRepeat(id) {
    const repeats = state.repeats.filter(r => r.id !== id);
    setState({ repeats });
}
