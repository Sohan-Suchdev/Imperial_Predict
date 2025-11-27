// 1. CONSTANTS & STATE
const DATA_FILE = 'data/imperial_computing_y1.json';
const TERM_ORDER = ["Term 1", "Term 2", "Full Year"]; // Defines the display order
let courseData = null;

// 2. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

// 3. FETCH DATA
async function fetchData() {
    try {
        const response = await fetch(DATA_FILE);
        if (!response.ok) throw new Error(`Could not find data file at ${DATA_FILE}`);
        courseData = await response.json();
        renderApp();
    } catch (error) {
        document.getElementById('app').innerHTML = `
            <div class="error">
                <h3>Error Loading Data</h3>
                <p>Make sure the file is in <code>${DATA_FILE}</code>.</p>
                <p>Details: ${error.message}</p>
            </div>`;
    }
}

// 4. RENDER UI
function renderApp() {
    const app = document.getElementById('app');
    const courseNameEl = document.getElementById('course-name');

    // Set Header Info
    courseNameEl.textContent = courseData.courseName;
    app.innerHTML = ''; // Clear loading message

    const modules = courseData.year1.modules;

    // Group modules by Term
    // Result looks like: { "Term 1": [module1, module2], "Term 2": [module3] }
    const modulesByTerm = modules.reduce((groups, module) => {
        const term = module.term || "Other"; // Default to "Other" if missing
        if (!groups[term]) {
            groups[term] = [];
        }
        groups[term].push(module);
        return groups;
    }, {});

    // Loop through defined order to render
    TERM_ORDER.forEach(termName => {
        // If this term exists in our data
        if (modulesByTerm[termName]) {
            // 1. Create Header for Term
            const termHeader = document.createElement('h2');
            termHeader.style.cssText = "color: var(--imperial-blue); border-bottom: 2px solid #ddd; padding-bottom: 5px; margin-top: 30px;";
            termHeader.textContent = termName;
            app.appendChild(termHeader);

            // 2. Create Cards for this Term
            modulesByTerm[termName].forEach(module => {
                const card = createModuleCard(module, modules.indexOf(module));
                app.appendChild(card);
            });
        }
    });
}

// Helper function to keep renderApp clean
function createModuleCard(module, globalModuleIndex) {
    const card = document.createElement('div');
    card.className = 'module-card';
    
    // Build HTML for tasks
    let tasksHtml = '';
    module.tasks.forEach((task, taskIndex) => {
        // Convert decimal weight (0.04) to percentage string (4%)
        const weightPct = Math.round(task.weight * 100) + '%';
        
        tasksHtml += `
            <div class="task-row">
                <div class="task-info">
                    <span class="task-name">${task.name}</span>
                    <span class="task-meta">${task.date} • Weight: ${weightPct}</span>
                </div>
                <div class="task-input-group">
                    <input 
                        type="number" 
                        class="task-input" 
                        placeholder="-" 
                        min="0" 
                        max="${task.maxScore}" 
                        data-module-index="${globalModuleIndex}" 
                        data-task-index="${taskIndex}"
                        oninput="calculateGrades()"
                    >
                    <span class="task-percentage">/ ${task.maxScore}</span>
                </div>
            </div>
        `;
    });

    // Assemble Card Content
    card.innerHTML = `
        <div class="module-header">
            <div style="display:flex; flex-direction:column;">
                <span class="module-title">${module.name}</span>
                <span style="font-size:0.8em; color:#777;">Credits: ${module.credits}</span>
            </div>
            <span class="module-grade" id="grade-${globalModuleIndex}">0%</span>
        </div>
        <div class="module-tasks">
            ${tasksHtml}
        </div>
    `;
    
    return card;
}

// 5. CALCULATION ENGINE
function calculateGrades() {
    let totalWeightedScore = 0;
    
    const totalCredits = courseData.year1.totalCredits;
    const modules = courseData.year1.modules;

    modules.forEach((module, moduleIndex) => {
        let currentModuleScore = 0;

        // Loop through all inputs for this module
        module.tasks.forEach((task, taskIndex) => {
            const input = document.querySelector(`input[data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
            
            // Safety check: input might not exist if we change filtering later
            if (input) {
                const val = parseFloat(input.value);
                if (!isNaN(val)) {
                    const percentage = val / task.maxScore;
                    currentModuleScore += (percentage * task.weight * 100);
                }
            }
        });

        // Update Module Badge
        const gradeBadge = document.getElementById(`grade-${moduleIndex}`);
        if (gradeBadge) {
            gradeBadge.textContent = currentModuleScore.toFixed(1) + '%';
            
            // Color coding
            if (currentModuleScore >= 70) { gradeBadge.style.color = '#2ecc71'; gradeBadge.style.background = '#e8f8f5'; }
            else if (currentModuleScore >= 60) { gradeBadge.style.color = '#f1c40f'; gradeBadge.style.background = '#fef9e7'; }
            else { gradeBadge.style.color = '#555'; gradeBadge.style.background = '#eee'; }
        }

        // Add to Year Total
        totalWeightedScore += (currentModuleScore * module.credits);
    });

    // Final Year Average
    const finalAverage = totalWeightedScore / totalCredits;
    const displayAverage = isNaN(finalAverage) ? 0 : finalAverage;
    
    document.getElementById('year-average').textContent = displayAverage.toFixed(2) + '%';
}