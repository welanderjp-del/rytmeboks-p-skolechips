import { getState, updateBox, removeBox, addBox, setState, setLayout, setActiveField, startRepeatSelection, completeRepeatSelection, cancelRepeatSelection, updateRepeat, removeRepeat } from '../state.js';
import { createCell } from './cell.js';
import { autoSizeDrumLabels } from '../utils/autosize.js';
import { saveToLocalStorage } from '../storage.js';

export function renderGrid() {
    const state = getState();
    const container = document.getElementById('app-container');
    
    if (!container) return;
    container.innerHTML = '';

    if (!state.boxes || !Array.isArray(state.boxes)) {
        console.warn('No boxes to render');
        return;
    }

    // Apply layout and mode classes
    const layoutClass = state.layout === 'grid' ? 'layout-grid' : 'layout-column';
    const modeClass = `mode-${state.mode}`;
    container.className = `flex-1 overflow-auto p-8 flex flex-col items-center bg-stone-200 print:bg-white print:p-0 ${layoutClass} ${modeClass}`;

    // Dynamic pagination logic
    const pages = [];
    let currentPage = [];
    let currentHeight = 0;
    const PAGE_HEIGHT_LIMIT = 910; // Increased to be more accurate to A4 internal height
    
    state.boxes.forEach((box, index) => {
        const isFirstOnPage = currentPage.length === 0;
        // More accurate height estimates:
        // Header/Formled area (~32px) + Page Header (60px if first on page) + Counter (30px if first on page) + Rows (50px each, or 160px in guitar mode)
        const rowHeight = state.mode === 'guitar' ? 160 : 50;
        const boxHeight = (isFirstOnPage ? 90 : 32) + (box.rows * rowHeight);
        const boxWithIndex = { ...box, globalIndex: index };
        
        // Add dynamic gap to height calculation
        let gap = 0;
        if (!isFirstOnPage) {
            const allSingleRow = [...currentPage, box].every(b => b.rows === 1);
            const boxCount = currentPage.length + 1;
            const totalRows = [...currentPage, box].reduce((sum, b) => sum + b.rows, 0);
            
            // Replicate the gap logic used in rendering
            // Base gaps are now even larger
            let baseGap = allSingleRow ? 26 : 30;
            
            if (allSingleRow && boxCount > 6) {
                gap = 24; // Slightly tighter for many single rows to ensure 8 fit
            } else if (totalRows > 10 || boxCount > 4) {
                gap = Math.max(16, baseGap - (totalRows - 10) * 1 - (boxCount - 4) * 2);
            } else {
                gap = baseGap;
            }
        }
        
        if (currentHeight + boxHeight + gap > PAGE_HEIGHT_LIMIT && currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [boxWithIndex];
            currentHeight = boxHeight;
        } else {
            currentPage.push(boxWithIndex);
            currentHeight += (boxHeight + gap);
        }
    });
    if (currentPage.length > 0) pages.push(currentPage);

    pages.forEach((pageBoxes, pageIndex) => {
        const page = document.createElement('div');
        page.className = 'a4-page bg-white shadow-2xl p-[20mm] flex flex-col mb-8 relative print:shadow-none print:mb-0';
        
        // Page Header (Instrument, Title, Artist)
        const pageHeader = document.createElement('div');
        pageHeader.className = 'page-header grid grid-cols-3 gap-4 mb-4 relative';
        
        // Page Number (Top Right)
        const pageNum = document.createElement('div');
        pageNum.className = 'absolute -top-8 right-0 text-[10px] text-stone-400 font-mono print:text-stone-300';
        pageNum.textContent = `${pageIndex + 1} af ${pages.length}`;
        pageHeader.appendChild(pageNum);

        const fields = [
            { id: 'instrument', placeholder: 'Instrument', value: state.instrument },
            { id: 'songTitle', placeholder: 'Sangtitel', value: state.songTitle },
            { id: 'artist', placeholder: 'Kunstner', value: state.artist }
        ];

        fields.forEach(field => {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex flex-col';
            
            const input = document.createElement('div');
            input.className = `header-field-input focus:bg-stone-50 transition-colors py-1 text-sm font-medium min-h-[1.5rem] ${!field.value ? 'is-empty' : ''}`;
            input.contentEditable = true;
            input.textContent = field.value;
            input.setAttribute('data-placeholder', field.placeholder);
            input.setAttribute('data-field', field.id);
            
            input.addEventListener('input', (e) => {
                const newValue = e.target.textContent;
                if (newValue) {
                    e.target.classList.remove('is-empty');
                } else {
                    e.target.classList.add('is-empty');
                }
                
                // Sync across all pages visually without triggering full render
                document.querySelectorAll(`.header-field-input[data-field="${field.id}"]`).forEach(el => {
                    if (el !== e.target) el.textContent = newValue;
                });
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            });

            input.addEventListener('focus', () => {
                setActiveField({ type: 'header', fieldId: field.id });
            });

            input.addEventListener('blur', (e) => {
                const newValue = e.target.textContent.trim();
                const currentState = getState();

                // Only clear if the active field in state is still THIS field
                if (currentState.activeField && 
                    currentState.activeField.type === 'header' &&
                    currentState.activeField.fieldId === field.id) {
                    setActiveField(null);
                }

                // Only update state on blur to avoid focus loss
                if (currentState[field.id] !== newValue) {
                    setState({ [field.id]: newValue }, true);
                    saveToLocalStorage();
                }
            });
            
            wrapper.appendChild(input);
            pageHeader.appendChild(wrapper);
        });
        
        page.appendChild(pageHeader);
        
        const boxesContainer = document.createElement('div');
        boxesContainer.className = 'boxes-container flex flex-col flex-1';
        
        // Dynamic gap calculation
        const totalRowsOnPage = pageBoxes.reduce((sum, box) => sum + box.rows, 0);
        const boxCount = pageBoxes.length;
        
        // Adjust gap based on both row count and box count
        // If we have many boxes, we need smaller gaps
        let baseGap = 30; 
        
        const allSingleRow = pageBoxes.every(b => b.rows === 1);
        if (allSingleRow) {
            baseGap = 26;
        }

        let gap = baseGap;

        // If page is crowded, reduce gap slightly but keep it natural
        if (allSingleRow && boxCount > 6) {
            gap = 24; 
        } else if (totalRowsOnPage > 10 || boxCount > 4) {
            gap = Math.max(16, baseGap - (totalRowsOnPage - 10) * 1 - (boxCount - 4) * 2);
        }
        
        boxesContainer.style.gap = `${gap}px`;
        
        pageBoxes.forEach((box) => {
            const boxIndex = box.globalIndex;
            const boxWrapper = document.createElement('div');
            boxWrapper.className = `rhythm-box-wrapper group relative ${box.hidden ? 'is-hidden' : ''}`;
            
            // Add Box Above Button (Visible on hover)
            const addAboveBtn = createAddBoxBtn(boxIndex);
            addAboveBtn.className = 'add-box-btn add-above';
            boxWrapper.appendChild(addAboveBtn);

            // Box Header (Formled + Controls)
            const header = document.createElement('div');
            header.className = 'box-header';
            
            const formledWrapper = document.createElement('div');
            formledWrapper.className = 'formled-wrapper flex-1';
            
            const formledInput = document.createElement('div');
            formledInput.className = `formled-input ${!box.formled ? 'is-empty' : ''}`;
            formledInput.contentEditable = true;
            formledInput.setAttribute('data-placeholder', 'Formled');
            formledInput.setAttribute('data-box-id', box.id);
            formledInput.textContent = box.formled;
            
            formledInput.addEventListener('input', (e) => {
                if (e.target.textContent) {
                    e.target.classList.remove('is-empty');
                } else {
                    e.target.classList.add('is-empty');
                }
            });

            formledInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            });

            formledInput.addEventListener('focus', () => {
                setActiveField({ type: 'formled', boxId: box.id });
            });

            formledInput.addEventListener('blur', (e) => {
                const currentState = getState();
                // Only clear if the active field in state is still THIS field
                if (currentState.activeField && 
                    currentState.activeField.type === 'formled' &&
                    currentState.activeField.boxId === box.id) {
                    setActiveField(null);
                }

                updateBox(box.id, { formled: e.target.textContent.trim() }, true);
                saveToLocalStorage();
            });
            
            formledWrapper.appendChild(formledInput);
            
            const controls = document.createElement('div');
            controls.className = 'box-controls print:hidden';
            
            const hideBtn = document.createElement('button');
            hideBtn.className = `btn-icon hide ${box.hidden ? 'active' : ''}`;
            hideBtn.innerHTML = box.hidden ? '👁️‍🗨️' : '👁️';
            hideBtn.title = box.hidden ? 'Vis boks' : 'Skjul boks';
            hideBtn.addEventListener('click', () => {
                updateBox(box.id, { hidden: !box.hidden });
                saveToLocalStorage();
            });
            controls.appendChild(hideBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-icon delete';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = 'Slet boks';
            
            // Prevent deleting the last box
            if (state.boxes.length <= 1) {
                deleteBtn.style.opacity = '0.3';
                deleteBtn.style.cursor = 'not-allowed';
            } else {
                deleteBtn.addEventListener('click', () => {
                    removeBox(box.id);
                    saveToLocalStorage();
                });
            }
            
            controls.appendChild(deleteBtn);
            
            header.appendChild(formledWrapper);
            header.appendChild(controls);
            boxWrapper.appendChild(header);

            // Table
            const table = document.createElement('table');
            table.className = `notation-grid mode-${state.mode} w-full border-collapse`;
            
            // Counter Row - Only for the first box on each page
            const isFirstOnPage = pageBoxes[0].id === box.id;
            if (isFirstOnPage) {
                const counterRow = document.createElement('tr');
                counterRow.className = 'counter-row';
                
                // Drum labels corner
                if (state.mode === 'drum') {
                    const cornerTd = document.createElement('td');
                    cornerTd.className = 'drum-label-cell';
                    counterRow.appendChild(cornerTd);
                }

                const beatLabels = getBeatLabels(state.timeSignature);
                for (let c = 0; c < box.cols; c++) {
                    const td = document.createElement('td');
                    td.textContent = beatLabels[c % beatLabels.length];
                    counterRow.appendChild(td);
                }
                table.appendChild(counterRow);
            }

            // Data Rows
            for (let r = 0; r < box.rows; r++) {
                const tr = document.createElement('tr');
                
                // Drum Label
                if (state.mode === 'drum') {
                    const labelTd = document.createElement('td');
                    labelTd.className = 'drum-label-cell';
                    const labelContent = document.createElement('div');
                    labelContent.className = 'drum-label-content';
                    labelContent.contentEditable = true;
                    labelContent.setAttribute('data-box-id', box.id);
                    labelContent.setAttribute('data-row', r);
                    labelContent.textContent = box.drumLabels[r];
                    
                    labelContent.addEventListener('input', (e) => {
                        const labels = [...box.drumLabels];
                        labels[r] = e.target.textContent;
                        // Update state without full re-render for input
                        box.drumLabels[r] = e.target.textContent;
                        autoSizeDrumLabels();
                    });
                    
                    labelContent.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.target.blur();
                        }
                    });

                    labelContent.addEventListener('focus', () => {
                        setActiveField({ type: 'drumLabel', boxId: box.id, r });
                    });

                    labelContent.addEventListener('blur', (e) => {
                        const currentState = getState();
                        // Only clear if the active field in state is still THIS field
                        if (currentState.activeField && 
                            currentState.activeField.type === 'drumLabel' &&
                            currentState.activeField.boxId === box.id &&
                            currentState.activeField.r === r) {
                            setActiveField(null);
                        }

                        const labels = [...box.drumLabels];
                        labels[r] = e.target.textContent.trim();
                        updateBox(box.id, { drumLabels: labels }, true);
                        saveToLocalStorage();
                    });
                    
                    labelTd.appendChild(labelContent);
                    tr.appendChild(labelTd);
                }

                // Cells
                for (let c = 0; c < box.cols; c++) {
                    const cell = createCell(box.id, r, c);
                    const content = cell.querySelector('.cell-content');
                    if (content) {
                        content.setAttribute('data-box-id', box.id);
                        content.setAttribute('data-row', r);
                        content.setAttribute('data-col', c);
                    }
                    tr.appendChild(cell);
                }
                
                table.appendChild(tr);
            }

            boxWrapper.appendChild(table);

            // Add Box Below Button (Visible on hover)
            const addBelowBtn = createAddBoxBtn(boxIndex + 1);
            addBelowBtn.className = 'add-box-btn add-below';
            boxWrapper.appendChild(addBelowBtn);

            // Repeat Button
            const repeatBtn = createRepeatBtn(box.id);
            boxWrapper.appendChild(repeatBtn);

            // Repeat Selection Overlay
            if (state.repeatSelection) {
                const overlay = document.createElement('div');
                overlay.className = 'repeat-selection-overlay';
                overlay.innerHTML = '<span>Hertil</span>';
                overlay.addEventListener('click', (e) => {
                    e.stopPropagation();
                    completeRepeatSelection(box.id);
                    saveToLocalStorage();
                });
                boxWrapper.appendChild(overlay);
            }

            boxesContainer.appendChild(boxWrapper);
        });
        
        page.appendChild(boxesContainer);
        
        if (state.layout === 'grid') {
            const wrapper = document.createElement('div');
            wrapper.className = 'page-grid-wrapper';
            wrapper.appendChild(page);
            
            // Clicking a page in grid view switches back to column view and scrolls to that page
            wrapper.addEventListener('click', () => {
                // Hide container to prevent flicker during re-render and jump
                container.style.opacity = '0';
                container.style.transition = 'none';
                
                setLayout('column');
                
                // Scroll to this page after re-render
                setTimeout(() => {
                    const allPages = document.querySelectorAll('.a4-page');
                    if (allPages[pageIndex]) {
                        allPages[pageIndex].scrollIntoView({ behavior: 'auto' });
                    }
                    // Fade back in
                    requestAnimationFrame(() => {
                        container.style.transition = 'opacity 0.2s';
                        container.style.opacity = '1';
                    });
                }, 50);
            });
            
            container.appendChild(wrapper);
        } else {
            container.appendChild(page);
        }
    });

    // Render Repeats for all pages after they are in the DOM
    if (state.layout === 'column') {
        document.querySelectorAll('.a4-page').forEach((page, pageIndex) => {
            renderRepeats(page, pages[pageIndex]);
        });
    }
    
    // Ensure repeats are recalculated for print
    if (!window._printHandlerAdded) {
        window.addEventListener('beforeprint', () => {
            // Re-render repeats specifically for print layout
            const currentState = getState();
            if (currentState.layout === 'column') {
                // We need the pages data, which is local to renderGrid. 
                // For simplicity, let's just trigger a full render which will call renderRepeats.
                // The browser will apply print styles before calculating offsets.
                renderGrid();
            }
        });
        window._printHandlerAdded = true;
    }
    
    // Restore focus if activeField exists
    if (state.activeField) {
        let el = null;
        const { type } = state.activeField;

        if (type === 'cell') {
            const { boxId, r, c } = state.activeField;
            el = document.querySelector(`.cell-content[data-box-id="${boxId}"][data-row="${r}"][data-col="${c}"]`);
        } else if (type === 'header') {
            const { fieldId } = state.activeField;
            // Focus the first instance of the header field (usually only one per page, we pick the first one found)
            el = document.querySelector(`.header-field-input[data-field="${fieldId}"]`);
        } else if (type === 'formled') {
            const { boxId } = state.activeField;
            // We need to find the formled input in the box with boxId
            // Since we re-rendered, we can find it by looking for the box wrapper or just a selector if we add data-box-id to it
            // Let's add data-box-id to formled-input in the loop above
            el = document.querySelector(`.formled-input[data-box-id="${boxId}"]`);
        } else if (type === 'drumLabel') {
            const { boxId, r } = state.activeField;
            // Similar for drum labels, let's add data-box-id and data-row
            el = document.querySelector(`.drum-label-content[data-box-id="${boxId}"][data-row="${r}"]`);
        }

        if (el) {
            el.focus();
            // Place cursor at end of text
            const range = document.createRange();
            const sel = window.getSelection();
            if (el.childNodes.length > 0) {
                range.selectNodeContents(el);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }

    if (state.mode === 'drum') {
        autoSizeDrumLabels();
    }
}

function createAddBoxBtn(index) {
    const btn = document.createElement('button');
    btn.innerHTML = '<span>+</span>';
    btn.addEventListener('click', () => {
        addBox(index);
        saveToLocalStorage();
    });
    return btn;
}

function createRepeatBtn(boxId) {
    const state = getState();
    const isSelecting = state.repeatSelection && state.repeatSelection.startBoxId === boxId;
    const existingRepeat = state.repeats?.find(r => r.startBoxId === boxId || r.endBoxId === boxId);
    
    const btn = document.createElement('button');
    btn.className = 'repeat-btn';
    
    if (isSelecting) {
        btn.title = 'Annuller gentagelse';
        btn.classList.add('remove');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            cancelRepeatSelection();
            saveToLocalStorage();
        });
    } else if (existingRepeat) {
        btn.title = 'Fjern gentagelse';
        btn.classList.add('remove');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeRepeat(existingRepeat.id);
            saveToLocalStorage();
        });
    } else {
        btn.title = 'Gentag stykke';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
        `;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            startRepeatSelection(boxId);
        });
    }
    return btn;
}

function renderRepeats(page, pageBoxes) {
    const state = getState();
    if (!state.repeats || state.repeats.length === 0) return;

    const bracketContainer = document.createElement('div');
    bracketContainer.className = 'repeat-bracket-container';
    page.appendChild(bracketContainer);

    // Helper to get offset relative to the page element
    const getOffsetRelativeToPage = (el) => {
        const rect = el.getBoundingClientRect();
        const pageRect = page.getBoundingClientRect();
        return {
            top: rect.top - pageRect.top,
            left: rect.left - pageRect.left,
            width: rect.width,
            height: rect.height
        };
    };

    const pageBoxIds = pageBoxes.map(b => b.id);

    state.repeats.forEach(repeat => {
        const startIndex = state.boxes.findIndex(b => b.id === repeat.startBoxId);
        const endIndex = state.boxes.findIndex(b => b.id === repeat.endBoxId);
        
        if (startIndex === -1 || endIndex === -1) return;

        const firstBoxOnPageIndex = state.boxes.findIndex(b => b.id === pageBoxIds[0]);
        const lastBoxOnPageIndex = state.boxes.findIndex(b => b.id === pageBoxIds[pageBoxIds.length - 1]);

        // Check if this repeat intersects with this page
        const startsBeforePage = startIndex < firstBoxOnPageIndex;
        const endsAfterPage = endIndex > lastBoxOnPageIndex;
        const startsOnPage = pageBoxIds.includes(repeat.startBoxId);
        const endsOnPage = pageBoxIds.includes(repeat.endBoxId);
        const spansPage = startsBeforePage && endsAfterPage;

        if (!startsOnPage && !endsOnPage && !spansPage) return;

        let top, bottom;

        if (startsOnPage) {
            const startBoxEl = page.querySelector(`.formled-input[data-box-id="${repeat.startBoxId}"]`)?.closest('.rhythm-box-wrapper');
            const startGrid = startBoxEl?.querySelector('.notation-grid');
            if (startGrid) {
                const offset = getOffsetRelativeToPage(startGrid);
                top = offset.top;
            }
        } else if (startIndex < firstBoxOnPageIndex) {
            // Starts on a previous page
            const firstBoxEl = page.querySelector(`.formled-input[data-box-id="${pageBoxIds[0]}"]`)?.closest('.rhythm-box-wrapper');
            const firstGrid = firstBoxEl?.querySelector('.notation-grid');
            if (firstGrid) {
                const offset = getOffsetRelativeToPage(firstGrid);
                top = offset.top;
            }
        }

        if (endsOnPage) {
            const endBoxEl = page.querySelector(`.formled-input[data-box-id="${repeat.endBoxId}"]`)?.closest('.rhythm-box-wrapper');
            const endGrid = endBoxEl?.querySelector('.notation-grid');
            if (endGrid) {
                const offset = getOffsetRelativeToPage(endGrid);
                bottom = offset.top + offset.height;
            }
        } else if (endIndex > lastBoxOnPageIndex) {
            // Ends on a later page
            const lastBoxEl = page.querySelector(`.formled-input[data-box-id="${pageBoxIds[pageBoxIds.length - 1]}"]`)?.closest('.rhythm-box-wrapper');
            const lastGrid = lastBoxEl?.querySelector('.notation-grid');
            if (lastGrid) {
                const offset = getOffsetRelativeToPage(lastGrid);
                bottom = offset.top + offset.height;
            }
        }

        if (top !== undefined && bottom !== undefined) {
            // Get horizontal position from any box on this page
            const sampleBoxEl = page.querySelector('.rhythm-box-wrapper');
            const sampleGrid = sampleBoxEl?.querySelector('.notation-grid');
            if (!sampleGrid) return;
            
            // Get horizontal position from rhythm cells to handle drum labels correctly
            const firstCell = sampleGrid.querySelector('tr:not(.counter-row) td:not(.drum-label-cell)');
            const lastRow = sampleGrid.querySelector('tr:last-child');
            const lastCell = lastRow ? lastRow.querySelector('td:last-child') : null;
            
            let left, right;
            if (firstCell && lastCell) {
                const leftOffset = getOffsetRelativeToPage(firstCell);
                const rightOffset = getOffsetRelativeToPage(lastCell);
                left = leftOffset.left;
                right = rightOffset.left + rightOffset.width;
            } else {
                const offset = getOffsetRelativeToPage(sampleGrid);
                left = offset.left;
                right = left + offset.width;
            }
            
            const height = bottom - top;

            // Left Bracket
            const leftBracket = document.createElement('div');
            leftBracket.className = 'repeat-bracket left';
            if (!startsOnPage) leftBracket.style.borderTop = 'none';
            if (!endsOnPage) leftBracket.style.borderBottom = 'none';
            leftBracket.style.top = `${top}px`;
            leftBracket.style.left = `${left - 20}px`;
            leftBracket.style.height = `${height}px`;
            bracketContainer.appendChild(leftBracket);

            // Right Bracket
            const rightBracket = document.createElement('div');
            rightBracket.className = 'repeat-bracket right';
            if (!startsOnPage) rightBracket.style.borderTop = 'none';
            if (!endsOnPage) rightBracket.style.borderBottom = 'none';
            rightBracket.style.top = `${top}px`;
            rightBracket.style.left = `${right + 8}px`;
            rightBracket.style.height = `${height}px`;
            bracketContainer.appendChild(rightBracket);

            // Count Input (only if it ends on this page)
            if (endsOnPage) {
                const countInput = document.createElement('div');
                countInput.className = 'repeat-count-input';
                countInput.contentEditable = true;
                countInput.textContent = repeat.count;
                countInput.style.top = `${top + height / 2}px`;
                countInput.style.left = `${right + 20}px`;
                
                countInput.addEventListener('blur', (e) => {
                    updateRepeat(repeat.id, { count: e.target.textContent.trim() });
                    saveToLocalStorage();
                });

                countInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.target.blur();
                    }
                });
                
                bracketContainer.appendChild(countInput);
            }
        }
    });
}

function getBeatLabels(sig) {
    if (sig === "4/4") return ["1", "2", "3", "4"];
    if (sig === "4/4+") return ["1", "og", "2", "og", "3", "og", "4", "og"];
    if (sig === "3/4") return ["1", "2", "3"];
    if (sig === "3/4+") return ["1", "og", "2", "og", "3", "og"];
    if (sig === "6/8") return ["1", "2", "3", "4", "5", "6"];
    return [];
}
