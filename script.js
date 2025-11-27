// 1. CONSTANTS & STATE
// UPDATED PATH: Pointing to the new 'data' folder
const DATA_FILE = 'data/imperial_computing_y1.json';
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
    const yearAverageEl = document.getElementById('year-average');
    const courseNameEl = document.getElementById('course-name');

    // Set Header Info
    courseNameEl.textContent = courseData.courseName;
    app.innerHTML = ''; // Clear loading message

    // Loop through modules and create cards
    courseData.modules.forEach((module, moduleIndex) => {
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
                            data-module-index="${moduleIndex}" 
                            data-task-index="${taskIndex}"
                            oninput="calculateGrades()"
                        >
                        <span class="task-percentage">/ ${task.maxScore}</span>
                    </div>
                </div>
            `;
        });

        // Assemble Card
        card.innerHTML = `
            <div class="module-header">
                <span class="module-title">${module.id} - ${module.name}</span>
                <span class="module-grade" id="grade-${moduleIndex}">0%</span>
            </div>
            <div class="module-tasks">
                ${tasksHtml}
            </div>
        `;
        app.appendChild(card);
    });
}

// 5. CALCULATION ENGINE
function calculateGrades() {
    let totalYearScore = 0;
    // Note: Assuming equal weighting for modules for now.
    
    let moduleCount = courseData.modules.length;

    courseData.modules.forEach((module, moduleIndex) => {
        let currentModuleScore = 0;
        let currentModuleWeightUsed = 0;

        // Loop through all inputs for this module
        module.tasks.forEach((task, taskIndex) => {
            // Find the specific input box
            const input = document.querySelector(`input[data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
            const val = parseFloat(input.value);

            if (!isNaN(val)) {
                // Normalize to percentage (val / maxScore)
                const percentage = val / task.maxScore;
                
                // Add to module total (Percentage * Weight)
                // Example: 70% * 0.4 weight = 0.28 contribution
                // We multiply by 100 to keep it in readable numbers (28 points)
                currentModuleScore += (percentage * task.weight * 100);
                currentModuleWeightUsed += task.weight;
            }
        });

        // Update Module Badge
        const gradeBadge = document.getElementById(`grade-${moduleIndex}`);
        gradeBadge.textContent = currentModuleScore.toFixed(1) + '%';
        
        // Color coding
        if (currentModuleScore >= 70) { gradeBadge.style.color = '#2ecc71'; gradeBadge.style.background = '#e8f8f5'; } // First
        else if (currentModuleScore >= 60) { gradeBadge.style.color = '#f1c40f'; gradeBadge.style.background = '#fef9e7'; } // 2:1
        else { gradeBadge.style.color = '#555'; gradeBadge.style.background = '#eee'; }

        totalYearScore += currentModuleScore;
    });

    // Update Year Average
    const finalAverage = totalYearScore / moduleCount;
    document.getElementById('year-average').textContent = finalAverage.toFixed(2) + '%';
}