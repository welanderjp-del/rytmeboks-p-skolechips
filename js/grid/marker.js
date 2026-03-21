import { getState, updateMarker } from '../state.js';
import { saveToLocalStorage } from '../storage.js';

export function createMarker(boxId, r, side) {
    const state = getState();
    const box = state.boxes.find(b => b.id === boxId);
    const text = box.markers[r][side];
    
    const td = document.createElement('td');
    td.className = `marker-cell ${side}`;
    
    const content = document.createElement('div');
    content.className = 'marker-content';
    content.contentEditable = true;
    content.textContent = text;
    
    content.addEventListener('blur', (e) => {
        updateMarker(boxId, r, side, e.target.textContent, true);
        saveToLocalStorage();
    });
    
    // Prevent default enter behavior to keep it single line
    content.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            content.blur();
        }
    });

    td.appendChild(content);
    return td;
}
