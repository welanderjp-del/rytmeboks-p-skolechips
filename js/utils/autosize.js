import { getState } from '../state.js';

export function autoSizeDrumLabels() {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
        const labels = document.querySelectorAll('.drum-label-content');
        labels.forEach(el => {
            const parent = el.parentElement;
            if (!parent) return;
            
            const maxHeight = parent.clientHeight - 4;
            const maxWidth = parent.clientWidth - 8;
            
            let fontSize = 32; // Start with a larger max size
            el.style.fontSize = fontSize + 'px';
            
            // Reduce font size until it fits
            while ((el.scrollWidth > maxWidth || el.scrollHeight > maxHeight) && fontSize > 8) {
                fontSize -= 0.2;
                el.style.fontSize = fontSize + 'px';
            }
        });
    });
}

// Handle window resize
window.addEventListener('resize', () => {
    if (getState().mode === 'drum') {
        autoSizeDrumLabels();
    }
});
