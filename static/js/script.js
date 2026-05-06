// Core Dashboard Logic
let shapChart = null;
let globalChart = null;
let matrixChart = null;
let rocChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initPredictor();
    loadPerformanceMetrics();
    loadGlobalInsights();
});

// Tab Switching
function initTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));

            item.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Predictor Logic
function initPredictor() {
    const form = document.getElementById('prediction-form');
    const submitBtn = document.getElementById('submit-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await runAnalysis();
    });

    // Add What-If Interactivity: Update on change (debounced)
    const inputs = form.querySelectorAll('input, select');
    let debounceTimer;
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(runAnalysis, 800);
        });
    });
}

async function runAnalysis() {
    const form = document.getElementById('prediction-form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // UI state
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.innerText = "ANALYZING...";
    
    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            if (response.status === 400 && result.details) {
                alert(`Validation Failed:\n${result.details.join('\n')}`);
            } else {
                throw new Error(result.error || "Analysis failed");
            }
            return;
        }
        
        renderPrediction(result);
        
    } catch (error) {
        console.error(error);
        alert(`Error: ${error.message}`);
    } finally {
        submitBtn.innerText = "RUN RISK ANALYSIS";
    }
}

function renderPrediction(data) {
    document.getElementById('result-placeholder').classList.add('hidden');
    document.getElementById('result-display').classList.remove('hidden');

    const probVal = document.getElementById('risk-percent');
    const badge = document.getElementById('risk-badge');
    const circle = document.getElementById('prob-circle');

    // Animate percentage
    animateValue(probVal, parseFloat(probVal.innerText) || 0, data.probability, 1000);

    // Update Badge
    if (data.prediction === 1) {
        badge.innerText = "High Risk Assessment";
        badge.className = "status-indicator status-high";
        circle.style.borderColor = "#FF0000";
    } else {
        badge.innerText = "Low Risk Verified";
        badge.className = "status-indicator status-low";
        circle.style.borderColor = "#8EA6A9";
    }

    // Render SHAP Chart
    renderShapChart(data);
}

function renderShapChart(data) {
    const ctx = document.getElementById('shapChart').getContext('2d');
    
    const sortedData = data.feature_names.map((name, i) => ({
        name: name.replace(/_/g, ' ').toUpperCase(),
        val: data.shap_contributions[i]
    })).sort((a, b) => Math.abs(b.val) - Math.abs(a.val)).slice(0, 8);

    const labels = sortedData.map(d => d.name);
    const values = sortedData.map(d => d.val);
    const colors = values.map(v => v > 0 ? '#FF0000' : '#8EA6A9');

    if (shapChart) shapChart.destroy();

    shapChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Feature Influence (SHAP)',
                data: values,
                backgroundColor: colors,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { display: false } }
            }
        }
    });
}

// Global Insights Logic
async function loadGlobalInsights() {
    try {
        const response = await fetch('/global-importance');
        const data = await response.json();
        
        const ctx = document.getElementById('globalImportanceChart').getContext('2d');
        globalChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.features.map(f => f.replace(/_/g, ' ').toUpperCase()),
                datasets: [{
                    label: 'Global Mean |SHAP|',
                    data: data.importance,
                    backgroundColor: '#8EA6A9',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#E5F5F4' } },
                    x: { grid: { display: false } }
                }
            }
        });
    } catch (e) { console.error(e); }
}

// Performance Metrics Logic
async function loadPerformanceMetrics() {
    try {
        const response = await fetch('/metrics');
        const data = await response.json();
        
        // Render Metric Cards
        const container = document.getElementById('metrics-container');
        const metrics = [
            { label: 'Accuracy', val: (data.accuracy * 100).toFixed(1) + '%' },
            { label: 'AUC-ROC', val: data.auc_roc.toFixed(2) },
            { label: 'F1-Score', val: data.f1_score.toFixed(2) },
            { label: 'Precision', val: data.precision.toFixed(2) }
        ];
        
        container.innerHTML = metrics.map(m => `
            <div class="metric-card">
                <span class="metric-val">${m.val}</span>
                <span class="metric-label">${m.label}</span>
            </div>
        `).join('');

        // Render Confusion Matrix
        renderConfusionMatrix(data.confusion_matrix);
        // Render ROC Curve
        renderRocCurve(data.auc_roc);

    } catch (e) { console.error(e); }
}

function renderConfusionMatrix(cm) {
    const ctx = document.getElementById('confusionMatrixChart').getContext('2d');
    matrixChart = new Chart(ctx, {
        type: 'bubble', 
        data: {
            datasets: [
                { label: 'TN', data: [{x: 0, y: 1, r: 40}], backgroundColor: '#8EA6A9' },
                { label: 'FP', data: [{x: 1, y: 1, r: 15}], backgroundColor: '#FF0000' },
                { label: 'FN', data: [{x: 0, y: 0, r: 20}], backgroundColor: '#FF0000' },
                { label: 'TP', data: [{x: 1, y: 0, r: 35}], backgroundColor: '#8EA6A9' }
            ]
        },
        options: {
            scales: {
                x: { min: -0.5, max: 1.5, ticks: { callback: v => v === 0 ? 'Actual: Neg' : v === 1 ? 'Actual: Pos' : '' } },
                y: { min: -0.5, max: 1.5, ticks: { callback: v => v === 0 ? 'Pred: Pos' : v === 1 ? 'Pred: Neg' : '' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function renderRocCurve(auc) {
    const ctx = document.getElementById('rocChart').getContext('2d');
    rocChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [0, 0.1, 0.2, 0.5, 1],
            datasets: [
                {
                    label: 'Model ROC',
                    data: [0, 0.7, 0.85, 0.945, 1],
                    borderColor: '#8EA6A9',
                    borderWidth: 3,
                    fill: true,
                    backgroundColor: 'rgba(142, 166, 169, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Random',
                    data: [0, 1],
                    borderColor: '#94A8AB',
                    borderDash: [5, 5],
                    fill: false
                }
            ]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { title: { display: true, text: 'False Positive Rate' } },
                y: { title: { display: true, text: 'True Positive Rate' } }
            }
        }
    });
}


// Utility: Animate Number
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = (progress * (end - start) + start).toFixed(1);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}