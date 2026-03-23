const notesSharp = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const notesFlat = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/**
 * Transposes a single chord name by a number of semitones.
 * @param {string} chord - The chord name (e.g., "C", "Am7", "F#maj7/E")
 * @param {number} semitones - Number of semitones to transpose (+1 or -1)
 * @returns {string} - The transposed chord name
 */
export function transposeChord(chord, semitones) {
    if (!chord || typeof chord !== 'string') return chord;

    // Handle slash chords (e.g., C/E)
    if (chord.includes('/')) {
        return chord.split('/').map(part => transposeChord(part, semitones)).join('/');
    }

    // Regex to match the root note (e.g., "C", "C#", "Db")
    // Note: We need to be careful with "H" (used in some regions for B)
    const rootMatch = chord.match(/^([A-Ga-g][#b]?|[Hh][#b]?)/);
    if (!rootMatch) return chord;

    let root = rootMatch[1];
    const suffix = chord.slice(root.length);

    // Normalize to uppercase for calculation
    let normalizedRoot = root.toUpperCase().replace('H', 'B');
    
    // Find current index
    let index = notesSharp.findIndex(n => n.toUpperCase() === normalizedRoot);
    if (index === -1) index = notesFlat.findIndex(n => n.toUpperCase() === normalizedRoot);
    
    if (index === -1) return chord; // Should not happen if regex is correct

    // Calculate new index
    let newIndex = (index + semitones) % 12;
    if (newIndex < 0) newIndex += 12;

    // Decide whether to use sharp or flat based on the original root or common preference
    // If original had a sharp, use sharp. If original had a flat, use flat.
    // Default to sharps for +1 and flats for -1 if neutral.
    let newRoot;
    if (root.includes('#')) {
        newRoot = notesSharp[newIndex];
    } else if (root.includes('b')) {
        newRoot = notesFlat[newIndex];
    } else {
        // Neutral root (e.g., "C")
        newRoot = semitones > 0 ? notesSharp[newIndex] : notesFlat[newIndex];
    }

    // Restore "H" if it was used originally (case-insensitive)
    if (root.toUpperCase().startsWith('H')) {
        newRoot = newRoot.replace('B', 'H');
    }

    return newRoot + suffix;
}
