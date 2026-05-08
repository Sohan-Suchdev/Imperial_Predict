// --- 1. CONFIGURATION ---
const INDEX_FILE = 'data/courses_index.json';
const TERM_ORDER = ["Term 1", "Term 2", "Terms 1 & 2", "Terms 2 & 3", "Term 3", "Full Year"]; 
const PASS_MARK_PERCENTAGE = 0.40;

let courseData = null; 
let indexData = null;  
let chartInstances = {}; // Tracks Insights Chart.js instances

// --- 2. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadHub();
});

// --- 3. THEME & MODAL LOGIC ---
function initTheme() {
    const savedTheme = localStorage.getItem('imperial-theme');
    if (savedTheme === 'dark' || savedTheme === null) {
        document.body.setAttribute('data-theme', 'dark');
        updateThemeIcons('☀️'); 
    } else {
        document.body.removeAttribute('data-theme');
        updateThemeIcons('🌙'); 
    }
}

function toggleTheme() {
    if (document.body.getAttribute('data-theme') === 'dark') {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('imperial-theme', 'light');
        updateThemeIcons('🌙'); 
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('imperial-theme', 'dark');
        updateThemeIcons('☀️');
    }
}

function updateThemeIcons(icon) {
    document.querySelectorAll('.theme-toggle').forEach(btn => btn.textContent = icon);
}

function openModal() { document.getElementById('info-modal').style.display = 'block'; }
function closeModal() { document.getElementById('info-modal').style.display = 'none'; }
window.onclick = function(event) {
    const modal = document.getElementById('info-modal');
    if (event.target == modal) modal.style.display = "none";
}

// --- 4. HUB LOGIC ---
async function loadHub() {
    try {
        const response = await fetch(INDEX_FILE);
        if (!response.ok) throw new Error("Could not load course index.");
        indexData = await response.json();
        renderHub();
    } catch (error) {
        document.getElementById('hub-course-list').innerHTML = `<div class="error">${error.message}</div>`;
    }
}

function renderHub() {
    const announcementBox = document.getElementById('hub-announcement');
    const courseList = document.getElementById('hub-course-list');

    announcementBox.innerHTML = `
        <div class="announcement-header"><span>📢</span> ${indexData.announcement.title}</div>
        <div class="announcement-text">${indexData.announcement.message}</div>
        <div class="announcement-footer">${indexData.announcement.footer}</div>
    `;

    courseList.innerHTML = '';
    
    indexData.departments.forEach(dept => {
        const section = document.createElement('div');
        section.className = 'dept-section';
        const title = document.createElement('div');
        title.className = 'dept-title';
        title.textContent = dept.name;
        section.appendChild(title);
        const grid = document.createElement('div');
        grid.className = 'course-grid';

        dept.courses.forEach(course => {
            const btn = document.createElement('button');
            btn.className = 'course-btn';
            btn.textContent = course.name;
            if (course.file) {
                btn.onclick = () => loadCourse(course.file);
            } else {
                btn.classList.add('disabled');
                btn.disabled = true;
            }
            grid.appendChild(btn);
        });
        section.appendChild(grid);
        courseList.appendChild(section);
    });
}

// --- 5. NAVIGATION LOGIC ---
function loadCourse(filepath) {
    document.getElementById('hub-view').style.display = 'none';
    document.getElementById('calculator-view').style.display = 'block';
    document.querySelector('.hero').style.display = 'none';
    document.getElementById('app').innerHTML = '<div class="loading">Loading course data...</div>';
    fetchCourseData(filepath);
}

function showHub() {
    document.getElementById('calculator-view').style.display = 'none';
    document.getElementById('hub-view').style.display = 'block';
    document.querySelector('.hero').style.display = 'flex';
    window.scrollTo(0, 0);
}

// --- 6. CALCULATOR CORE ---
async function fetchCourseData(file) {
    try {
        const response = await fetch(file);
        if (!response.ok) throw new Error("Could not load course file.");
        courseData = await response.json();
        renderApp();
    } catch (error) {
        document.getElementById('app').innerHTML = `<div class="error">${error.message}</div>`;
    }
}

function renderApp() {
    const app = document.getElementById('app');
    document.getElementById('course-name').textContent = courseData.courseName;
    app.innerHTML = '';
    app.appendChild(createSummaryCard());
    renderModulesByTerm(app);
    loadCourseState();
    calculateGrades();
}

function createSummaryCard() {
    const card = document.createElement('div');
    card.className = 'summary-card';
    card.innerHTML = `
        <h3 class="summary-title">Degree Classification</h3>
        <div class="markband-grid">
            <div class="markband-cell" id="band-3rd"><strong>3rd</strong><span>40-50%</span></div>
            <div class="markband-cell" id="band-22"><strong>2:2</strong><span>50-60%</span></div>
            <div class="markband-cell" id="band-21"><strong>2:1</strong><span>60-70%</span></div>
            <div class="markband-cell" id="band-1st"><strong>1st</strong><span>70%+</span></div>
        </div>
    `;
    return card;
}

function renderModulesByTerm(container) {
    const modules = courseData.year1.modules;
    const modulesByTerm = modules.reduce((groups, module) => {
        const term = module.term || "Other";
        if (!groups[term]) groups[term] = [];
        groups[term].push(module);
        return groups;
    }, {});

    TERM_ORDER.forEach(termName => {
        if (modulesByTerm[termName]) {
            const termHeader = document.createElement('h2');
            termHeader.className = "term-header";
            termHeader.textContent = termName;
            container.appendChild(termHeader);

            modulesByTerm[termName].forEach(module => {
                const globalIndex = modules.indexOf(module);
                const card = createModuleCard(module, globalIndex);
                container.appendChild(card);
            });
        }
    });
}

function createModuleCard(module, globalModuleIndex) {
    const card = document.createElement('div');
    card.className = 'module-card collapsed'; 
    let tasksHtml = '';
    module.tasks.forEach((task, taskIndex) => {
        const weightPct = Math.round(task.weight * 100) + '%';
        const defaultVal = Math.ceil(task.maxScore * PASS_MARK_PERCENTAGE);

        tasksHtml += `
            <div class="task-row">
                <div style="margin-right: 10px;">
                    <input type="checkbox" class="task-checkbox" checked
                        data-module-index="${globalModuleIndex}" data-task-index="${taskIndex}"
                        onchange="calculateGrades()" title="Include this task">
                </div>
                <div class="task-info">
                    <span class="task-name">${task.name}</span>
                    <span class="task-meta">Weight: ${weightPct}</span>
                </div>
                <div class="task-input-group">
                    <input type="range" class="task-slider" min="0" max="${task.maxScore}" value="${defaultVal}"
                        data-module-index="${globalModuleIndex}" data-task-index="${taskIndex}"
                        oninput="syncInputs(this, 'number')">
                    <input type="number" class="task-input" value="${defaultVal}" min="0" max="${task.maxScore}"
                        data-module-index="${globalModuleIndex}" data-task-index="${taskIndex}"
                        oninput="syncInputs(this, 'range')">
                    <span class="task-percentage">/ ${task.maxScore}</span>
                </div>
            </div>
        `;
    });

    const hasInsights = module.insights && module.insights.historicalTrend;
    const insightButtonHtml = hasInsights 
        ? `<button class="insight-btn" onclick="event.stopPropagation(); toggleInsights(${globalModuleIndex})" title="View Module Insights">ℹ️ Insights</button>` 
        : '';

    let insightsHtml = '';
    if (hasInsights) {
        const feedbackItems = module.insights.feedbackSummary.map(fb => `<li>${fb}</li>`).join('');
        insightsHtml = `
            <div class="insights-panel" id="insights-${globalModuleIndex}">
                <h4>Examiner Feedback Summary</h4>
                <ul class="feedback-list">${feedbackItems}</ul>
                <h4>Historical Average</h4>
                <div class="chart-container">
                    <canvas id="chart-${globalModuleIndex}"></canvas>
                </div>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="module-header" onclick="toggleCard(this)">
            <div class="module-title-group">
                <input type="checkbox" class="module-checkbox" checked
                    data-module-index="${globalModuleIndex}"
                    onclick="event.stopPropagation(); calculateGrades();"
                    style="margin-right: 15px; transform: scale(1.2);">
                <span class="chevron"></span> 
                <div style="display:flex; flex-direction:column;">
                    <span class="module-title">${module.name}</span>
                    <span style="font-size:0.8em; color:#777;">Credits: ${module.credits}</span>
                </div>
            </div>
            <div style="display:flex; align-items:center;">
                <span class="module-grade" id="grade-${globalModuleIndex}">0%</span>
                ${insightButtonHtml}
            </div>
        </div>
        <div class="module-tasks">${tasksHtml}</div>
        ${insightsHtml}
    `;
    return card;
}

function toggleCard(el) { el.parentElement.classList.toggle('collapsed'); }

function calculateGrades() {
    let totalWeightedScore = 0;
    let totalActiveCredits = 0;
    let totalCourseCredits = 0; 
    let absolutePointsAchieved = 0; 

    const isPassMode = document.getElementById('pass-mode-toggle')?.checked || false;
    const modules = courseData.year1.modules;

    modules.forEach((module, moduleIndex) => {
        totalCourseCredits += module.credits;

        const modCheckbox = document.querySelector(`.module-checkbox[data-module-index="${moduleIndex}"]`);
        const isModChecked = modCheckbox ? modCheckbox.checked : true;
        const isModuleActive = isPassMode ? true : isModChecked;

        let currentModuleScore = 0; 
        let currentModuleMaxWeight = 0;
        let absoluteModuleScore = 0; 

        module.tasks.forEach((task, taskIndex) => {
            const taskCheckbox = document.querySelector(`.task-checkbox[data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
            const isTaskChecked = taskCheckbox ? taskCheckbox.checked : true;
            const isActive = isPassMode ? true : isTaskChecked;

            const input = document.querySelector(`input[type="number"][data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
            const row = input ? input.closest('.task-row') : null;
            const rangeInput = document.querySelector(`input[type="range"][data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
            const isAutofilled = row ? row.classList.contains('autofilled-row') : false;

            // UI Logic
            if (isTaskChecked && isModChecked) {
                if(row) { row.style.opacity = "1"; row.classList.remove('autofilled-row'); }
                if(input) { input.disabled = false; input.classList.remove('autofilled-input'); }
                if(rangeInput) { rangeInput.disabled = false; rangeInput.classList.remove('autofilled-slider'); }
            } else {
                if (isAutofilled) {
                    if(row) row.style.opacity = "1";
                    if(input) input.disabled = false;
                    if(rangeInput) rangeInput.disabled = false;
                } else {
                    if(row) row.style.opacity = "0.4";
                    if(input) input.disabled = true;
                    if(rangeInput) rangeInput.disabled = true;
                }
            }

            // Math Logic
            if (isActive) {
                let val = 0;
                if (isTaskChecked && isModChecked && input && input.value !== "") {
                    val = parseFloat(input.value);
                } else if (isPassMode && (!isTaskChecked || !isModChecked)) {
                    val = task.maxScore * 0.40;
                }

                if (!isNaN(val)) {
                    currentModuleScore += (val / task.maxScore) * task.weight * 100;
                    currentModuleMaxWeight += task.weight;
                }
            }

            if (isTaskChecked && isModChecked && input && input.value !== "") {
                let val = parseFloat(input.value);
                if (!isNaN(val)) absoluteModuleScore += (val / task.maxScore) * task.weight * 100;
            }
        });

        let finalModuleGrade = 0;
        if (currentModuleMaxWeight > 0) finalModuleGrade = Math.min(100, currentModuleScore / currentModuleMaxWeight);
        
        absolutePointsAchieved += (absoluteModuleScore * module.credits);

        const gradeBadge = document.getElementById(`grade-${moduleIndex}`);
        if (!isModChecked && !isPassMode) {
            if(gradeBadge) { gradeBadge.textContent = "Ignored"; gradeBadge.style.background = "#eee"; gradeBadge.style.color = "#999"; }
        } else if (isModuleActive) {
            if (gradeBadge) {
                gradeBadge.textContent = finalModuleGrade.toFixed(1) + '%';
                if (finalModuleGrade >= 70) { gradeBadge.style.color = '#2ecc71'; gradeBadge.style.background = '#e8f8f5'; }
                else if (finalModuleGrade >= 60) { gradeBadge.style.color = '#f1c40f'; gradeBadge.style.background = '#fef9e7'; }
                else { gradeBadge.style.color = '#555'; gradeBadge.style.background = '#eee'; }
            }
            totalWeightedScore += (finalModuleGrade * module.credits);
            totalActiveCredits += module.credits;
        }
    });

    let finalAverage = totalActiveCredits > 0 ? totalWeightedScore / totalActiveCredits : 0;
    
    const yearAvgEl = document.getElementById('year-average');
    let degreeClass = finalAverage >= 70 ? "(1st)" : finalAverage >= 60 ? "(2:1)" : finalAverage >= 50 ? "(2:2)" : finalAverage >= 40 ? "(3rd)" : "(Fail)";
    yearAvgEl.textContent = `${finalAverage.toFixed(2)}% ${degreeClass}`;
    yearAvgEl.style.color = isPassMode ? "var(--success-green)" : "#fff";

    document.querySelectorAll('.markband-cell').forEach(el => el.classList.remove('active'));
    if (finalAverage >= 70) document.getElementById('band-1st').classList.add('active');
    else if (finalAverage >= 60) document.getElementById('band-21').classList.add('active');
    else if (finalAverage >= 50) document.getElementById('band-22').classList.add('active');
    else if (finalAverage >= 40) document.getElementById('band-3rd').classList.add('active');

    if (typeof updateTargetPredictor === 'function') updateTargetPredictor(absolutePointsAchieved, totalCourseCredits, modules);
    if (typeof updateTrajectoryGraph === 'function') updateTrajectoryGraph(modules);
    if (typeof saveCourseState === 'function') saveCourseState();
}

// --- 7. TARGET PREDICTOR & SEE-SAW LOGIC ---
function handleTargetChange() {
    const targetStr = document.getElementById('target-degree')?.value || "none";
    if (targetStr === "none") {
        document.querySelectorAll('.autofilled-row').forEach(el => el.classList.remove('autofilled-row'));
        document.querySelectorAll('.autofilled-input').forEach(el => el.classList.remove('autofilled-input'));
        document.querySelectorAll('.autofilled-slider').forEach(el => el.classList.remove('autofilled-slider'));
    }
    calculateGrades();
}

function syncInputs(el, targetType) {
    const modIdx = el.getAttribute('data-module-index');
    const taskIdx = el.getAttribute('data-task-index');
    const target = document.querySelector(`input[type="${targetType}"][data-module-index="${modIdx}"][data-task-index="${taskIdx}"]`);
    if (target) target.value = el.value;

    const targetStr = document.getElementById('target-degree')?.value || "none";
    const row = el.closest('.task-row');
    const isAutofilled = row ? row.classList.contains('autofilled-row') : false;

    if (isAutofilled && targetStr !== "none") balanceUnchecked(modIdx, taskIdx);
    calculateGrades();
}

function updateTargetPredictor(absolutePointsAchieved, totalCourseCredits, modules) {
    const targetOutput = document.getElementById('target-output');
    const targetText = document.getElementById('target-text');
    const autofillContainer = document.getElementById('autofill-container');
    const autofillBtn = document.getElementById('autofill-btn');
    const targetStr = document.getElementById('target-degree')?.value || "none";

    if (!targetOutput || targetStr === "none") {
        if (targetOutput) targetOutput.style.display = "none";
        return;
    }

    targetOutput.style.display = "block";
    const targetOverallAvg = parseFloat(targetStr);
    const targetTotalPoints = targetOverallAvg * totalCourseCredits;
    const pointsNeeded = targetTotalPoints - absolutePointsAchieved;

    let remainingMaxPoints = 0;
    modules.forEach((module, moduleIndex) => {
        const modCheckbox = document.querySelector(`.module-checkbox[data-module-index="${moduleIndex}"]`);
        const isModChecked = modCheckbox ? modCheckbox.checked : true;

        module.tasks.forEach((task, taskIndex) => {
            const taskCheckbox = document.querySelector(`.task-checkbox[data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
            const isTaskChecked = taskCheckbox ? taskCheckbox.checked : true;
            if (!isModChecked || !isTaskChecked) remainingMaxPoints += (task.weight * 100) * module.credits;
        });
    });

    autofillContainer.style.display = "none"; 

    if (pointsNeeded <= 0) {
        targetText.innerHTML = `🎉 You have already secured enough marks to guarantee a ${targetOverallAvg}%!`;
        targetText.style.color = "var(--success-green)"; 
    } else if (remainingMaxPoints === 0) {
        targetText.innerHTML = `❌ You cannot reach ${targetOverallAvg}% with your current grades.`;
        targetText.style.color = "var(--danger-red)"; 
    } else {
        const requiredAvg = (pointsNeeded / remainingMaxPoints) * 100;
        if (requiredAvg > 100) {
            targetText.innerHTML = `❌ You need to average ${requiredAvg.toFixed(1)}% on remaining work. It is mathematically impossible.`;
            targetText.style.color = "var(--danger-red)"; 
        } else {
            targetText.innerHTML = `🎯 You need to average <strong>${requiredAvg.toFixed(1)}%</strong> on your remaining assignments.`;
            targetText.style.color = "inherit";
            autofillContainer.style.display = "block";
            autofillBtn.onclick = () => autoFillGrades(requiredAvg, modules);
        }
    }
}

function autoFillGrades(requiredAvgPercentage, modules) {
    modules.forEach((module, moduleIndex) => {
        const modCheckbox = document.querySelector(`.module-checkbox[data-module-index="${moduleIndex}"]`);
        const isModChecked = modCheckbox ? modCheckbox.checked : true;

        module.tasks.forEach((task, taskIndex) => {
            const taskCheckbox = document.querySelector(`.task-checkbox[data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
            const isTaskChecked = taskCheckbox ? taskCheckbox.checked : true;

            if (!isModChecked || !isTaskChecked) {
                const row = taskCheckbox?.closest('.task-row');
                const numInput = document.querySelector(`input[type="number"][data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
                const rangeInput = document.querySelector(`input[type="range"][data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);

                let requiredScore = Math.round((requiredAvgPercentage / 100) * task.maxScore);
                requiredScore = Math.max(0, Math.min(task.maxScore, requiredScore));

                if (numInput) numInput.value = requiredScore;
                if (rangeInput) rangeInput.value = requiredScore;

                if (row) { row.classList.add('autofilled-row'); row.style.opacity = "1"; }
                if (numInput) { numInput.classList.add('autofilled-input'); numInput.disabled = false; }
                if (rangeInput) { rangeInput.classList.add('autofilled-slider'); rangeInput.disabled = false; }
            }
        });
    });
    calculateGrades();
}

function balanceUnchecked(exemptModIdx, exemptTaskIdx) {
    const targetStr = document.getElementById('target-degree').value;
    const targetOverallAvg = parseFloat(targetStr);
    const modules = courseData.year1.modules;

    let totalCourseCredits = 0;
    let absolutePointsAchieved = 0; 
    let remainingMaxPoints = 0; 
    let exemptPoints = 0; 

    modules.forEach((module, moduleIndex) => {
        totalCourseCredits += module.credits;
        const modCheckbox = document.querySelector(`.module-checkbox[data-module-index="${moduleIndex}"]`);
        const isModChecked = modCheckbox ? modCheckbox.checked : true;

        module.tasks.forEach((task, taskIndex) => {
            const taskCheckbox = document.querySelector(`.task-checkbox[data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
            const isTaskChecked = taskCheckbox ? taskCheckbox.checked : true;
            const input = document.querySelector(`input[type="number"][data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
            let val = input ? parseFloat(input.value) : 0;
            if (isNaN(val)) val = 0;

            const maxTaskPoints = (task.weight * 100) * module.credits;

            if (isModChecked && isTaskChecked) {
                absolutePointsAchieved += (val / task.maxScore) * maxTaskPoints;
            } else {
                if (moduleIndex.toString() === exemptModIdx.toString() && taskIndex.toString() === exemptTaskIdx.toString()) {
                    exemptPoints += (val / task.maxScore) * maxTaskPoints;
                } else {
                    remainingMaxPoints += maxTaskPoints;
                }
            }
        });
    });

    const targetTotalPoints = targetOverallAvg * totalCourseCredits;
    const pointsNeededFromOthers = targetTotalPoints - absolutePointsAchieved - exemptPoints;

    let requiredAvg = 0;
    if (remainingMaxPoints > 0) requiredAvg = (pointsNeededFromOthers / remainingMaxPoints) * 100;

    modules.forEach((module, moduleIndex) => {
        const modCheckbox = document.querySelector(`.module-checkbox[data-module-index="${moduleIndex}"]`);
        const isModChecked = modCheckbox ? modCheckbox.checked : true;

        module.tasks.forEach((task, taskIndex) => {
            const taskCheckbox = document.querySelector(`.task-checkbox[data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
            const isTaskChecked = taskCheckbox ? taskCheckbox.checked : true;

            if (!isModChecked || !isTaskChecked) {
                if (moduleIndex.toString() === exemptModIdx.toString() && taskIndex.toString() === exemptTaskIdx.toString()) return;

                const numInput = document.querySelector(`input[type="number"][data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
                const rangeInput = document.querySelector(`input[type="range"][data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);

                let requiredScore = Math.round((requiredAvg / 100) * task.maxScore);
                requiredScore = Math.max(0, Math.min(task.maxScore, requiredScore));

                if (numInput) numInput.value = requiredScore;
                if (rangeInput) rangeInput.value = requiredScore;
            }
        });
    });
}

// --- 8. STATE PERSISTENCE ---
function saveCourseState() {
    if (!courseData) return;
    const state = { modules: [] };
    courseData.year1.modules.forEach((module, moduleIndex) => {
        const modCheckbox = document.querySelector(`.module-checkbox[data-module-index="${moduleIndex}"]`);
        const modState = { isActive: modCheckbox ? modCheckbox.checked : true, tasks: [] };

        module.tasks.forEach((task, taskIndex) => {
            const taskCheckbox = document.querySelector(`.task-checkbox[data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
            const input = document.querySelector(`input[type="number"][data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
            modState.tasks.push({
                isActive: taskCheckbox ? taskCheckbox.checked : true,
                value: input ? parseFloat(input.value) : 0
            });
        });
        state.modules.push(modState);
    });

    state.passMode = document.getElementById('pass-mode-toggle')?.checked || false;
    state.targetValue = document.getElementById('target-degree')?.value || "none";
    localStorage.setItem('imperial-predict-state-' + courseData.courseName, JSON.stringify(state));
}

function loadCourseState() {
    if (!courseData) return;
    const savedStateStr = localStorage.getItem('imperial-predict-state-' + courseData.courseName);
    if (!savedStateStr) return; 

    try {
        const state = JSON.parse(savedStateStr);
        state.modules.forEach((modState, moduleIndex) => {
            const modCheckbox = document.querySelector(`.module-checkbox[data-module-index="${moduleIndex}"]`);
            if (modCheckbox) modCheckbox.checked = modState.isActive;

            modState.tasks.forEach((taskState, taskIndex) => {
                const taskCheckbox = document.querySelector(`.task-checkbox[data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
                const numberInput = document.querySelector(`input[type="number"][data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
                const rangeInput = document.querySelector(`input[type="range"][data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);

                if (taskCheckbox) taskCheckbox.checked = taskState.isActive;
                if (numberInput) numberInput.value = taskState.value;
                if (rangeInput) rangeInput.value = taskState.value;
            });
        });
        const toggle = document.getElementById('pass-mode-toggle');
        const targetDropdown = document.getElementById('target-degree');
        if (toggle) toggle.checked = state.passMode || false;
        if (targetDropdown) targetDropdown.value = state.targetValue || "none";
    } catch (error) { console.error("Could not load saved grades:", error); }
}

function clearCourseState() {
    if (courseData && confirm("Are you sure you want to reset all your grades for this course? This cannot be undone.")) {
        localStorage.removeItem('imperial-predict-state-' + courseData.courseName);
        renderApp(); 
    }
}

// --- 9. INSIGHTS & GRAPHING LOGIC ---
function toggleInsights(moduleIndex) {
    const panel = document.getElementById(`insights-${moduleIndex}`);
    if (!panel) return;
    if (panel.style.display === 'block') {
        panel.style.display = 'none';
    } else {
        panel.style.display = 'block';
        renderModuleChart(moduleIndex);
    }
}

function renderModuleChart(moduleIndex) {
    const module = courseData.year1.modules[moduleIndex];
    if (!module || !module.insights || !module.insights.historicalTrend) return;
    const ctx = document.getElementById(`chart-${moduleIndex}`).getContext('2d');
    if (chartInstances[moduleIndex]) chartInstances[moduleIndex].destroy();

    const labels = module.insights.historicalTrend.map(d => d.year);
    const dataPoints = module.insights.historicalTrend.map(d => d.average);
    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDarkMode ? '#e0e0e0' : '#333';
    const gridColor = isDarkMode ? '#333' : '#ddd';

    chartInstances[moduleIndex] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Historical Average',
                data: dataPoints,
                borderColor: '#4a90e2',
                backgroundColor: 'rgba(74, 144, 226, 0.2)',
                borderWidth: 2,
                pointBackgroundColor: '#4a90e2',
                fill: true,
                tension: 0.3 
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { min: 40, max: 100, grid: { color: gridColor }, ticks: { color: textColor } },
                x: { grid: { color: gridColor }, ticks: { color: textColor } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function updateTrajectoryGraph(modules) {
    const terms = {"Term 1": {score:0, credits:0}, "Term 2": {score:0, credits:0}, "Term 3": {score:0, credits:0}};

    modules.forEach((module, moduleIndex) => {
        const modCheckbox = document.querySelector(`.module-checkbox[data-module-index="${moduleIndex}"]`);
        if(modCheckbox && !modCheckbox.checked) return;

        let modScore = 0; let modWeight = 0;
        module.tasks.forEach((task, taskIndex) => {
            const taskCheckbox = document.querySelector(`.task-checkbox[data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
            if(taskCheckbox && !taskCheckbox.checked) return;

            const input = document.querySelector(`input[type="number"][data-module-index="${moduleIndex}"][data-task-index="${taskIndex}"]`);
            if (input && input.value !== "") {
                modScore += (parseFloat(input.value) / task.maxScore) * task.weight * 100;
                modWeight += task.weight;
            }
        });

        if (modWeight > 0) {
            let finalModGrade = Math.min(100, modScore / modWeight);
            if (module.term.includes("Term 1") || module.term === "Full Year") { terms["Term 1"].score += finalModGrade * module.credits; terms["Term 1"].credits += module.credits; }
            if (module.term.includes("Term 2") || module.term === "Full Year") { terms["Term 2"].score += finalModGrade * module.credits; terms["Term 2"].credits += module.credits; }
            if (module.term.includes("Term 3") || module.term === "Full Year") { terms["Term 3"].score += finalModGrade * module.credits; terms["Term 3"].credits += module.credits; }
        }
    });

    const dataPoints = [
        terms["Term 1"].credits > 0 ? terms["Term 1"].score / terms["Term 1"].credits : null,
        terms["Term 2"].credits > 0 ? terms["Term 2"].score / terms["Term 2"].credits : null,
        terms["Term 3"].credits > 0 ? terms["Term 3"].score / terms["Term 3"].credits : null
    ];

    const container = document.getElementById('trajectory-container');
    if (dataPoints.every(d => d === null)) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    const ctx = document.getElementById('trajectory-chart').getContext('2d');
    if (window.trajectoryChartInstance) window.trajectoryChartInstance.destroy();

    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDarkMode ? '#e0e0e0' : '#333';
    const gridColor = isDarkMode ? '#333' : '#ddd';

    window.trajectoryChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Term 1', 'Term 2', 'Term 3'],
            datasets: [{
                label: 'Term Average',
                data: dataPoints,
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.2)',
                borderWidth: 3,
                pointBackgroundColor: '#2ecc71',
                fill: true,
                spanGaps: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { min: 40, max: 100, grid: { color: gridColor }, ticks: { color: textColor } },
                x: { grid: { color: gridColor }, ticks: { color: textColor } }
            },
            plugins: { legend: { display: false } }
        }
    });
}