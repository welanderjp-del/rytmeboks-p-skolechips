import { getState, setState } from './state.js';

const STORAGE_KEY = 'notation_app_data';

export function saveToLocalStorage() {
    const state = getState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadFromLocalStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            setState(data);
            return true;
        } catch (e) {
            console.error("Failed to parse saved data", e);
        }
    }
    return false;
}

export function exportToJSON() {
    const state = getState();
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${state.title.replace(/\s+/g, '_')}_notation.json`;
    
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
                const data = JSON.parse(e.target.result);
                setState(data);
                resolve(data);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}
