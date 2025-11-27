/**
 * IMPERIAL PREDICT - LOGIC ENGINE
 * -------------------------------
 * This script handles fetching course data, rendering the UI,
 * and calculating weighted grades in real-time.
 */

// --- 1. CONFIGURATION & STATE ---

const DATA_FILE = 'data/imperial_computing_y1.json';
const TERM_ORDER = ["Term 1", "Term 2", "Full Year"];
const PASS_MARK_PERCENTAGE = 0.40; // Default to 40% (Pass)

// Stores the loaded JSON data globally
let courseData = null;


// --- 2. INITIALIZATION ---

// Wait for HTML to be fully loaded before running logic
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});


// --- 3. DATA FETCHING ---

async function fetchData() {
    try {
        const response = await fetch(DATA_FILE);
        
        // Handle 404s or network errors
        if (!response.ok) throw new Error(`Could not find data file at ${DATA_FILE}`);
        
        courseData = await response.json();
        renderApp();
    } catch (error) {
        showError(error.message);
    }
}

function showError(message) {
    document.getElementById('app').innerHTML = `
        <div class="error">
            <h3>Error Loading Data</h3>
            <p>Make sure the file is in <code>${DATA_FILE}</code>.</p>
            <p>Details: ${message}</p>
        </div>`;
}


// --- 4. RENDER ORCHESTRATOR ---

function renderApp() {
    const app = document.getElementById('app');
    const courseNameEl = document.getElementById('course-name');

    // 1. Set Header
    courseNameEl.textContent = courseData.courseName;
    app.innerHTML = ''; // Clear loading spinner

    // 2. Render Degree Classification Card (Top)
    app.appendChild(createSummaryCard());

    // 3. Group and Render Modules by Term
    renderModulesByTerm(app);

    // 4. Calculate initial grades (using the defaults we set)
    calculateGrades();
}


// --- 5. COMPONENT FACTORIES (HTML BUILDERS) ---

/**
 * Creates the "Degree Classification" card with the markband table.
 */
function createSummaryCard() {
    const card = document.createElement('div');
    card.className = 'summary-card';
    card.innerHTML = `
        <h3 class="summary-title">Degree Classification</h3>
        <div class="markband-grid">
            <div class="markband-cell" id="band-3rd">
                <strong>3rd</strong>
                <span>40-50%</span>
            </div>
            <div class="markband-cell" id="band-22">
                <strong>2:2</strong>
                <span>50-60%</span>
            </div>
            <div class="markband-cell" id="band-21">
                <strong>2:1</strong>
                <span>60-70%</span>
            </div>
            <div class="markband-cell" id="band-1st">
                <strong>1st</strong>
                <span>70%+</span>
            </div>
        </div>
    `;
    return card;
}

/**
 * Sorts modules into terms and renders them in the specific TERM_ORDER.
 */
function renderModulesByTerm(containerElement) {
    const modules = courseData.year1.modules;
    
    // Group modules: { "Term 1": [modA, modB], "Term 2": [modC] }
    const modulesByTerm = modules.reduce((groups, module) => {
        const term = module.term || "Other";
        if (!groups[term]) groups[term] = [];
        groups[term].push(module);
        return groups;
    }, {});

    // Iterate through our preferred order (Term 1 -> Term 2 -> Full Year)
    TERM_ORDER.forEach(termName => {
        if (modulesByTerm[termName]) {
            // Render Header
            const termHeader = document.createElement('h2');
            termHeader.className = "term-header"; 
            termHeader.textContent = termName;
            containerElement.appendChild(termHeader);

            // Render Cards
            modulesByTerm[termName].forEach(module => {
                // Pass global index so we can identify inputs later
                const globalIndex = modules.indexOf(module);
                const card = createModuleCard(module, globalIndex);
                containerElement.appendChild(card);
            });
        }
    });
}

/**
 * Creates a single Module Card (Header + Task Rows).
 * Default state is collapsed.
 */
function createModuleCard(module, globalModuleIndex) {
    const card = document.createElement('div');
    card.className = 'module-card collapsed'; 
    
    let tasksHtml = '';
    
    // Generate rows for Exams/Coursework
    module.tasks.forEach((task, taskIndex) => {
        const weightPct = Math.round(task.weight * 100) + '%';
        const defaultVal = Math.ceil(task.maxScore * PASS_MARK_PERCENTAGE);

        tasksHtml += `
            <div class="task-row">
                <!-- NEW: Task Ignore Checkbox -->
                <div style="margin-right: 10px;">
                    <input 
                        type="checkbox" 
                        class="task-checkbox" 
                        checked
                        data-module-index="${globalModuleIndex}" 
                        data-task-index="${taskIndex}"
                        onchange="calculateGrades()"
                        title="Include this task in calculation"
                    >
                </div>

                <div class="task-info">
                    <span class="task-name">${task.name}</span>
                    <span class="task-meta">${task.date} • Weight: ${weightPct}</span>
                </div>
                <div class="task-input-group">
                    <!-- Slider Input -->
                    <input 
                        type="range" 
                        class="task-slider" 
                        min="0" 
                        max="${task.maxScore}" 
                        value="${defaultVal}"
                        data-module-index="${globalModuleIndex}" 
                        data-task-index="${taskIndex}"
                        oninput="syncInputs(this, 'number')"
                    >
                    <!-- Number Input -->
                    <input 
                        type="number" 
                        class="task-input" 
                        value="${defaultVal}"
                        min="0" 
                        max="${task.maxScore}" 
                        data-module-index="${globalModuleIndex}" 
                        data-task-index="${taskIndex}"
                        oninput="syncInputs(this, 'range')"
                    >
                    <span class="task-percentage">/ ${task.maxScore}</span>
                </div>
            </div>
        `;
    });

    // Assemble full card
    card.innerHTML = `
        <div class="module-header" onclick="toggleCard(this)">
            <div class="module-title-group">
                <!-- NEW: Module Ignore Checkbox -->
                <input 
                    type="checkbox" 
                    class="module-checkbox" 
                    checked
                    data-module-index="${globalModuleIndex}"
                    onclick="event.stopPropagation(); calculateGrades();"
                    title="Include this module in year average"
                >
                
                <span class="chevron"></span> 
                <div style="display:flex; flex-direction:column;">
                    <span class="module-title">${module.name}</span>
                    <span style="font-size:0.8em; color:#777;">Credits: ${module.credits}</span>
                </div>
            </div>
            <span class="module-grade" id="grade-${globalModuleIndex}">0%</span>
        </div>
        <div class="module-tasks">
            ${tasksHtml}
        </div>
    `;
    
    return card;
}


// --- 6. EVENT HANDLERS ---

/**
 * Expands/Collapses a module card when header is clicked.
 */
function toggleCard(headerElement) {
    const card = headerElement.parentElement;
    card.classList.toggle('collapsed');
}

/**
 * Keeps the Slider and Number Box in sync.
 * When one changes, it updates the other, then triggers calculation.
 */
function syncInputs(sourceElement, targetType) {
    const moduleIdx = sourceElement.getAttribute('data-module-index');
    const taskIdx = sourceElement.getAttribute('data-task-index');
    const value = sourceElement.value;

    // Find the partner input
    const targetInput = document.querySelector(`input[type="${targetType}"][data-module-index="${moduleIdx}"][data-task-index="${taskIdx}"]`);
    
    if (targetInput) {
        targetInput.value = value;
    }
    
    calculateGrades();
}


// --- 7. CALCULATION ENGINE (THE MATH) ---

function calculateGrades() {
    let totalWeightedScore = 0;
    let totalActiveCredits = 0;
    
    const modules = courseData.year1.modules;

    modules.forEach((module, moduleIndex) => {
        // 1. Check if Module is Ignored
        const moduleCheckbox = document.querySelector(`.module-checkbox[data-module-index="${moduleIndex}"]`);
        const isModuleActive = moduleCheckbox ? moduleCheckbox.checked : true;

        if (!isModuleActive) {
            // If module is ignored, gray it out visualy
            const badge = document.getElementById(`grade-${moduleIndex}`);
            if(badge) {
                badge.textContent = "Ignored";
                badge.style.background = "#eee";
                badge.style.color = "#999";
            }
            return; // Skip to next module
        }

        let currentModuleScore = 0;
        let currentModuleMaxWeight = 0; // Tracks how much of the module we are actually counting (0.0 to 1.0)

        // 2. Loop Tasks
        module.tasks.forEach((task, taskIndex) => {
            // Check if Task is Ignored
            const taskCheckbox = document.querySelector(`.task-checkbox[data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
            const isTaskActive = taskCheckbox ? taskCheckbox.checked : true;

            const input = document.querySelector(`input[type="number"][data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
            const rowDiv = input ? input.closest('.task-row') : null; // Get parent row for styling

            if (isTaskActive) {
                // Visuals: Make row normal
                if(rowDiv) rowDiv.style.opacity = "1";
                if(input) {
                    input.disabled = false;
                    // Also enable slider
                    const slider = document.querySelector(`input[type="range"][data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
                    if(slider) slider.disabled = false;
                }

                // Math: Calculate score
                if (input && input.value !== "") {
                    const val = parseFloat(input.value);
                    if (!isNaN(val)) {
                        const percentage = val / task.maxScore; // 0.0 to 1.0
                        currentModuleScore += (percentage * task.weight * 100); 
                        currentModuleMaxWeight += task.weight;
                    }
                }
            } else {
                // Visuals: Fade row out
                if(rowDiv) rowDiv.style.opacity = "0.4";
                if(input) {
                    input.disabled = true;
                    // Also disable slider
                    const slider = document.querySelector(`input[type="range"][data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
                    if(slider) slider.disabled = true;
                }
            }
        });

        // 3. Normalize Module Score
        // If I've only done 20% of the course, and I got full marks, my currentModuleScore is 20.
        // My currentModuleMaxWeight is 0.2.
        // Real Grade = 20 / 0.2 = 100%.
        let finalModuleGrade = 0;
        if (currentModuleMaxWeight > 0) {
            finalModuleGrade = currentModuleScore / currentModuleMaxWeight;
            // Cap at 100 just in case of floating point errors
            if(finalModuleGrade > 100) finalModuleGrade = 100; 
        }

        // 4. Update the visual badge
        updateModuleBadge(moduleIndex, finalModuleGrade);

        // 5. Add to Year Total
        totalWeightedScore += (finalModuleGrade * module.credits);
        totalActiveCredits += module.credits;
    });

    // 6. Final Year Average
    // Prevent division by zero if all modules are ignored
    let finalAverage = 0;
    if (totalActiveCredits > 0) {
        finalAverage = totalWeightedScore / totalActiveCredits;
    }
    
    // 7. Update UI
    updateDegreeClassification(finalAverage);
}

function updateModuleBadge(index, score) {
    const gradeBadge = document.getElementById(`grade-${index}`);
    if (gradeBadge) {
        gradeBadge.textContent = score.toFixed(1) + '%';
        
        // Color logic
        if (score >= 70) { gradeBadge.style.color = '#2ecc71'; gradeBadge.style.background = '#e8f8f5'; }
        else if (score >= 60) { gradeBadge.style.color = '#f1c40f'; gradeBadge.style.background = '#fef9e7'; }
        else { gradeBadge.style.color = '#555'; gradeBadge.style.background = '#eee'; }
    }
}

function updateDegreeClassification(average) {
    // 1. Update Header Text
    const yearAvgEl = document.getElementById('year-average');
    
    let degreeClass = "";
    if (average >= 70) degreeClass = "(1st)";
    else if (average >= 60) degreeClass = "(2:1)";
    else if (average >= 50) degreeClass = "(2:2)";
    else if (average >= 40) degreeClass = "(3rd)";
    else degreeClass = "(Fail)";

    yearAvgEl.textContent = `${average.toFixed(2)}% ${degreeClass}`;

    // 2. Highlight Table Cell
    document.querySelectorAll('.markband-cell').forEach(el => el.classList.remove('active'));

    // Only highlight if we actually have data
    if (average > 0) {
        if (average >= 70) document.getElementById('band-1st').classList.add('active');
        else if (average >= 60) document.getElementById('band-21').classList.add('active');
        else if (average >= 50) document.getElementById('band-22').classList.add('active');
        else if (average >= 40) document.getElementById('band-3rd').classList.add('active');
    }
}