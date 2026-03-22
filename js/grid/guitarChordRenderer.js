import { getState } from '../state.js';

export function renderGuitarChord(container, chordName, variationIndex = 0) {
    const state = getState();
    const chordsData = state.guitarChords?.guitar_mode;
    if (!chordsData || !chordName) return null;

    // Find chord by alias
    let chordKey = null;
    let foundChord = null;

    const searchName = chordName.trim().toLowerCase();

    for (const [key, data] of Object.entries(chordsData)) {
        if (data.aliases.some(alias => alias.toLowerCase() === searchName)) {
            chordKey = key;
            foundChord = data;
            break;
        }
    }

    if (!foundChord) return null;

    // Get variation
    const variations = foundChord.variations;
    const variation = variations[variationIndex % variations.length];
    if (!variation) return null;

    const frets = variation.frets;
    const label = variation.label_below;
    const svgConfig = state.guitarChords?.svg_config || { point_fill: "white", point_stroke: "black", line_color: "black" };

    // SVG parameters
    const width = 80;
    const height = 80;
    const margin = 10;
    const stringSpacing = 12;
    const fretSpacing = 12;
    const dotRadius = 3.5;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.display = "block";

    // Draw frets (horizontal lines)
    for (let i = 0; i <= 5; i++) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        const y = margin + i * fretSpacing;
        line.setAttribute("x1", margin);
        line.setAttribute("y1", y);
        line.setAttribute("x2", margin + 5 * stringSpacing);
        line.setAttribute("y2", y);
        line.setAttribute("stroke", svgConfig.line_color);
        line.setAttribute("stroke-width", i === 0 ? 2 : 1); // Nut is thicker
        svg.appendChild(line);
    }

    // Draw strings (vertical lines)
    for (let i = 0; i < 6; i++) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        const x = margin + i * stringSpacing;
        line.setAttribute("x1", x);
        line.setAttribute("y1", margin);
        line.setAttribute("x2", x);
        line.setAttribute("y2", margin + 5 * fretSpacing);
        line.setAttribute("stroke", svgConfig.line_color);
        line.setAttribute("stroke-width", 1);
        svg.appendChild(line);
    }

    // Find the range of frets to display if they go beyond 5th fret
    const activeFrets = frets.filter(f => typeof f === 'number' && f > 0);
    const minFret = activeFrets.length > 0 ? Math.min(...activeFrets) : 0;
    const maxFret = activeFrets.length > 0 ? Math.max(...activeFrets) : 0;
    
    let baseFret = 1;
    if (maxFret > 5) {
        baseFret = minFret;
    }

    // Draw dots
    frets.forEach((fret, stringIndex) => {
        const x = margin + stringIndex * stringSpacing;
        
        if (fret === "x") {
            // Muted string
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", x);
            text.setAttribute("y", margin - 2);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("font-size", "6");
            text.setAttribute("fill", svgConfig.line_color);
            text.textContent = "x";
            svg.appendChild(text);
        } else if (fret === 0) {
            // Open string
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", x);
            circle.setAttribute("cy", margin - 4);
            circle.setAttribute("r", dotRadius * 0.8); // Slightly smaller for open strings
            circle.setAttribute("fill", svgConfig.point_fill);
            circle.setAttribute("stroke", svgConfig.point_stroke);
            circle.setAttribute("stroke-width", 1);
            svg.appendChild(circle);
        } else {
            // Pressed fret
            const relativeFret = fret - baseFret + 1;
            if (relativeFret >= 1 && relativeFret <= 5) {
                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("cx", x);
                circle.setAttribute("cy", margin + (relativeFret - 0.5) * fretSpacing);
                circle.setAttribute("r", dotRadius);
                circle.setAttribute("fill", svgConfig.point_fill);
                circle.setAttribute("stroke", svgConfig.point_stroke);
                circle.setAttribute("stroke-width", 1);
                svg.appendChild(circle);
            }
        }
    });

    // Draw fret number if not starting from 1
    if (baseFret > 1) {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", margin - 4);
        text.setAttribute("y", margin + 0.5 * fretSpacing + 2);
        text.setAttribute("text-anchor", "end");
        text.setAttribute("font-size", "6");
        text.setAttribute("fill", svgConfig.line_color);
        text.textContent = baseFret;
        svg.appendChild(text);
    }

    container.appendChild(svg);
    return { chordKey, variationCount: variations.length };
}

export function getVariationCount(chordName) {
    const state = getState();
    const chordsData = state.guitarChords?.guitar_mode;
    if (!chordsData || !chordName) return 0;

    const searchName = chordName.trim().toLowerCase();
    for (const data of Object.values(chordsData)) {
        if (data.aliases.some(alias => alias.toLowerCase() === searchName)) {
            return data.variations.length;
        }
    }
    return 0;
}
