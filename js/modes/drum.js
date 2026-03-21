import { getState } from '../state.js';
import { autoSizeDrumLabels } from '../utils/autosize.js';

export function initDrumMode() {
    autoSizeDrumLabels();
}
