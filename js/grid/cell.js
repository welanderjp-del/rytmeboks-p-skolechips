import { getState, updateCell, setActiveField } from '../state.js';
import { saveToLocalStorage } from '../storage.js';
import { renderGuitarChord, getVariationCount } from './guitarChordRenderer.js';

const NOTE_COLORS = {
    'C': 'note-c',
    'C#': 'note-cs', 'DB': 'note-db',
    'D': 'note-d',
    'D#': 'note-ds', 'EB': 'note-eb',
    'E': 'note-e',
    'F': 'note-f',
    'F#': 'note-fs', 'GB': 'note-gb',
    'G': 'note-g',
    'G#': 'note-gs', 'AB': 'note-ab',
    'A': 'note-a',
    'A#': 'note-as', 'BB': 'note-bb',
    'B': 'note-b', 'H': 'note-h'
};

function getNoteClass(text) {
    if (!text) return '';
    const upper = text.toUpperCase();
    // Check for exact match or starting with note
    for (const [note, className] of Object.entries(NOTE_COLORS)) {
        if (upper.startsWith(note)) return className;
    }
    return '';
}

function navigate(boxId, r, c, direction) {
    const state = getState();
    const boxes = state.boxes;
    const boxIndex = boxes.findIndex(b => b.id === boxId);
    const box = boxes[boxIndex];
    
    let nextBoxId = boxId;
    let nextR = r;
    let nextC = c;
    
    if (direction === 'ArrowRight') {
        if (c < box.cols - 1) {
            nextC = c + 1;
        } else if (r < box.rows - 1) {
            nextR = r + 1;
            nextC = 0;
        } else if (boxIndex < boxes.length - 1) {
            nextBoxId = boxes[boxIndex + 1].id;
            nextR = 0;
            nextC = 0;
        }
    } else if (direction === 'ArrowLeft') {
        if (c > 0) {
            nextC = c - 1;
        } else if (r > 0) {
            nextR = r - 1;
            nextC = box.cols - 1;
        } else if (boxIndex > 0) {
            const prevBox = boxes[boxIndex - 1];
            nextBoxId = prevBox.id;
            nextR = prevBox.rows - 1;
            nextC = prevBox.cols - 1;
        }
    } else if (direction === 'ArrowDown') {
        if (r < box.rows - 1) {
            nextR = r + 1;
        } else if (boxIndex < boxes.length - 1) {
            nextBoxId = boxes[boxIndex + 1].id;
            nextR = 0;
            nextC = Math.min(c, boxes[boxIndex + 1].cols - 1);
        }
    } else if (direction === 'ArrowUp') {
        if (r > 0) {
            nextR = r - 1;
        } else if (boxIndex > 0) {
            const prevBox = boxes[boxIndex - 1];
            nextBoxId = prevBox.id;
            nextR = prevBox.rows - 1;
            nextC = Math.min(c, prevBox.cols - 1);
        }
    }
    
    // Update active cell in state BEFORE focusing, so blur handler knows we are navigating
    setActiveField({ type: 'cell', boxId: nextBoxId, r: nextR, c: nextC });
    
    const selector = `.cell-content[data-box-id="${nextBoxId}"][data-row="${nextR}"][data-col="${nextC}"]`;
    const el = document.querySelector(selector);
    if (el) {
        el.focus();
    }
}

function updateFontSize(el) {
    // Reverted to fixed size as per user request
    el.style.fontSize = ''; 
}

export function createCell(boxId, r, c) {
    const state = getState();
    const box = state.boxes.find(b => b.id === boxId);
    const cellData = box.gridData[r][c];
    
    const td = document.createElement('td');
    const wrapper = document.createElement('div');
    wrapper.className = 'guitar-cell-wrapper';
    if (cellData.active) wrapper.classList.add('cell-active');
    
    const content = document.createElement('div');
    content.className = 'cell-content';
    content.setAttribute('data-box-id', boxId);
    content.setAttribute('data-row', r);
    content.setAttribute('data-col', c);
    
    // Apply note color
    const noteClass = getNoteClass(cellData.text);
    if (noteClass) {
        content.classList.add(noteClass);
        td.classList.add(noteClass);
    }

    content.contentEditable = state.mode !== 'drum';
    if (state.mode === 'drum') {
        content.tabIndex = 0;
    }
    content.textContent = cellData.text;
    updateFontSize(content);

    if (state.mode === 'drum') {
        const circle = document.createElement('div');
        circle.className = 'drum-circle';
        wrapper.appendChild(circle);
        
        content.addEventListener('click', (e) => {
            const newActive = !cellData.active;
            updateCell(boxId, r, c, { active: newActive });
            saveToLocalStorage();
        });
    }

    content.addEventListener('input', (e) => {
        const text = e.target.textContent;
        
        // Update color dynamically without re-rendering
        content.className = 'cell-content';
        // Also clear note classes from td
        for (const cls of Object.values(NOTE_COLORS)) {
            td.classList.remove(cls);
        }
        
        const newNoteClass = getNoteClass(text);
        if (newNoteClass) {
            content.classList.add(newNoteClass);
            td.classList.add(newNoteClass);
        }
        updateFontSize(e.target);

        // Auto-render guitar chord on type
        if (state.mode === 'guitar') {
            const chordContainer = wrapper.querySelector('.guitar-chord-container');
            const indicator = wrapper.querySelector('.inversion-indicator');
            const controls = wrapper.querySelector('.guitar-controls');
            
            if (chordContainer) {
                chordContainer.innerHTML = '';
                const result = renderGuitarChord(chordContainer, text, 0); // Reset to first variation on type
                
                // Sync state without re-rendering to keep inversion in sync with visual reset
                updateCell(boxId, r, c, { text, inversion: 0 }, true);

                if (result) {
                    const variationCount = result.variationCount;
                    if (indicator) {
                        indicator.textContent = `1/${variationCount}`;
                        indicator.style.display = variationCount > 1 ? 'block' : 'none';
                    }
                    if (controls) controls.style.display = 'flex';
                } else {
                    if (indicator) {
                        indicator.textContent = '';
                        indicator.style.display = 'none';
                    }
                    if (controls) controls.style.display = 'none';
                }
            }
        }
    });

    content.addEventListener('focus', () => {
        setActiveField({ type: 'cell', boxId, r, c });
    });

    content.addEventListener('blur', (e) => {
        const text = e.target.textContent.trim();
        const currentState = getState();
        
        // Only clear if the active cell in state is still THIS cell
        // If it's different, it means a navigation already set the next cell as active
        if (currentState.activeField && 
            currentState.activeField.type === 'cell' &&
            currentState.activeField.boxId === boxId && 
            currentState.activeField.r === r && 
            currentState.activeField.c === c) {
            setActiveField(null);
        }

        // Only update if text actually changed to avoid unnecessary re-renders
        if (text !== cellData.text.trim()) {
            updateCell(boxId, r, c, { text, inversion: 0 }, true);
            saveToLocalStorage();
        }
    });

    content.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
        } else if (e.key === ' ' && state.mode === 'drum') {
            // Space bar toggles circle in drum mode
            e.preventDefault();
            const newActive = !cellData.active;
            updateCell(boxId, r, c, { active: newActive });
            if (newActive) wrapper.classList.add('cell-active');
            else wrapper.classList.remove('cell-active');
            saveToLocalStorage();
        } else if (e.key === 'Backspace') {
            // Clear entire cell on backspace
            e.preventDefault();
            e.target.textContent = '';
            updateCell(boxId, r, c, { text: '' });
            saveToLocalStorage();
        } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            // Always navigate on arrow keys in note fields
            e.preventDefault();
            navigate(boxId, r, c, e.key);
        }
    });

    // Make entire cell clickable in guitar mode
    if (state.mode === 'guitar') {
        wrapper.addEventListener('click', () => {
            content.focus();
        });
    }

    wrapper.appendChild(content);

    if (state.mode === 'guitar') {
        const chordContainer = document.createElement('div');
        chordContainer.className = 'guitar-chord-container';
        
        const result = renderGuitarChord(chordContainer, cellData.text, cellData.inversion);
        const variationCount = result ? result.variationCount : 1;

        const indicator = document.createElement('div');
        indicator.className = 'inversion-indicator';
        indicator.textContent = result ? `${cellData.inversion + 1}/${variationCount}` : '';
        indicator.style.display = (result && variationCount > 1) ? 'block' : 'none';
        
        const controls = document.createElement('div');
        controls.className = 'guitar-controls';
        controls.style.display = result ? 'flex' : 'none';
        
        const prevBtn = document.createElement('button');
        prevBtn.className = 'guitar-btn';
        prevBtn.textContent = '◀';
        prevBtn.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent blur on content
            e.stopPropagation();
            const currentText = content.textContent.trim();
            const currentBox = getState().boxes.find(b => b.id === boxId);
            const currentInversion = currentBox.gridData[r][c].inversion;
            const currentVariationCount = getVariationCount(currentText) || 1;
            const newInv = (currentInversion - 1 + currentVariationCount) % currentVariationCount;
            updateCell(boxId, r, c, { text: currentText, inversion: newInv });
            saveToLocalStorage();
        });
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'guitar-btn';
        nextBtn.textContent = '▶';
        nextBtn.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent blur on content
            e.stopPropagation();
            const currentText = content.textContent.trim();
            const currentBox = getState().boxes.find(b => b.id === boxId);
            const currentInversion = currentBox.gridData[r][c].inversion;
            const currentVariationCount = getVariationCount(currentText) || 1;
            const newInv = (currentInversion + 1) % currentVariationCount;
            updateCell(boxId, r, c, { text: currentText, inversion: newInv });
            saveToLocalStorage();
        });
        
        controls.appendChild(prevBtn);
        controls.appendChild(nextBtn);
        
        wrapper.appendChild(chordContainer);
        wrapper.appendChild(indicator);
        wrapper.appendChild(controls);
    }

    td.appendChild(wrapper);
    return td;
}
