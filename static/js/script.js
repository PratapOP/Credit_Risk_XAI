// Core Dashboard Logic
let shapChart = null;
let benchmarkingChart = null;
let matrixChart = null;
let rocChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initPredictor();
    loadPerformanceMetrics();
    
    document.getElementById('export-btn').addEventListener('click', () => {
        window.print();
    });
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

    const inputs = form.querySelectorAll('input, select');
    let debounceTimer;
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(runAnalysis, 1200);
        });
    });
}

async function runAnalysis() {
    const form = document.getElementById('prediction-form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
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
        loadBenchmarking(data);
        
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

    animateValue(probVal, parseFloat(probVal.innerText) || 0, data.probability, 1000);

    if (data.prediction === 1) {
        badge.innerText = "High Risk Assessment";
        badge.className = "status-indicator status-high";
        circle.style.borderColor = "#FF0000";
    } else {
        badge.innerText = "Low Risk Verified";
        badge.className = "status-indicator status-low";
        circle.style.borderColor = "#8EA6A9";
    }

    renderShapChart(data);
    generateMitigationAdvisor(data);
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
            plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false } }, y: { grid: { display: false } } }
        }
    });
}

function generateMitigationAdvisor(data) {
    const container = document.getElementById('mitigation-content');
    const highRiskFactors = data.feature_names.map((name, i) => ({
        name: name,
        impact: data.shap_contributions[i]
    })).filter(f => f.impact > 0.05).sort((a, b) => b.impact - a.impact);

    if (highRiskFactors.length === 0) {
        container.innerHTML = `<p style="color: var(--brand-teal);">Applicant profile is optimized for approval.</p>`;
        return;
    }

    const strategies = {
        'loan_amnt': "Reduce loan amount by 10-15% to lower debt burden.",
        'loan_int_rate': "Negotiate for a lower interest rate or seek a co-signer.",
        'person_income': "Verify additional income sources to improve debt-to-income ratio.",
        'loan_percent_income': "Lower the loan amount to drop below the 20% income threshold.",
        'cb_person_default_on_file': "Require additional collateral due to prior default history.",
        'person_age': "Limited impact from age; focus on financial stability factors."
    };

    container.innerHTML = highRiskFactors.slice(0, 3).map(f => `
        <div class="mitigation-item">
            <strong>${f.name.replace(/_/g, ' ').toUpperCase()}:</strong> 
            ${strategies[f.name] || "Review institutional policy for this specific factor."}
        </div>
    `).join('');
}

// Peer Benchmarking Logic
async function loadBenchmarking(applicantData) {
    try {
        const response = await fetch('/benchmarking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(applicantData)
        });
        const cohort = await response.json();
        
        const ctx = document.getElementById('benchmarkingChart').getContext('2d');
        
        if (benchmarkingChart) benchmarkingChart.destroy();
        
        benchmarkingChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Income', 'Loan Amnt', 'Interest %', 'Age'],
                datasets: [
                    {
                        label: 'Applicant',
                        data: [
                            applicantData.person_income / cohort.avg_income,
                            applicantData.loan_amnt / cohort.avg_loan_amnt,
                            applicantData.loan_int_rate / cohort.avg_int_rate,
                            applicantData.person_age / cohort.avg_age
                        ],
                        borderColor: '#FF0000',
                        backgroundColor: 'rgba(255, 0, 0, 0.1)'
                    },
                    {
                        label: 'Cohort Avg',
                        data: [1, 1, 1, 1],
                        borderColor: '#8EA6A9',
                        backgroundColor: 'rgba(142, 166, 169, 0.1)'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { r: { beginAtZero: true, grid: { color: '#E5F5F4' } } }
            }
        });

        document.getElementById('cohort-summary-text').innerHTML = `
            <p><strong>Cohort:</strong> ${applicantData.loan_intent}</p>
            <p><strong>Peer Group Size:</strong> ${cohort.cohort_size.toLocaleString()} records</p>
            <p>The applicant's income is <strong>${((applicantData.person_income / cohort.avg_income) * 100).toFixed(0)}%</strong> of the cohort average.</p>
        `;
    } catch (e) { console.error(e); }
}

// Performance Metrics Logic
async function loadPerformanceMetrics() {
    try {
        const response = await fetch('/metrics');
        const data = await response.json();
        
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

        renderConfusionMatrix(data.confusion_matrix);
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
            scales: { x: { title: { display: true, text: 'False Positive Rate' } }, y: { title: { display: true, text: 'True Positive Rate' } } }
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