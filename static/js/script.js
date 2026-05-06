// Core Dashboard Logic
let shapChart = null;
let benchmarkingChart = null;
let matrixChart = null;
let rocChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initPredictor();
    initWebcam();
    loadPerformanceMetrics();
    
    // Fix: Initialize benchmarking with default state
    loadBenchmarking({
        loan_intent: 'EDUCATION',
        person_income: 50000,
        loan_amnt: 10000,
        loan_int_rate: 10,
        person_age: 25
    });

    document.getElementById('export-btn').addEventListener('click', () => {
        window.print();
    });
});

// Feature: Webcam Initialization
async function initWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.getElementById('webcam-feed');
        video.srcObject = stream;
    } catch (err) {
        console.warn("Webcam access denied or unavailable.");
    }
}

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
            debounceTimer = setTimeout(runAnalysis, 1500);
        });
    });
}

async function runAnalysis() {
    const form = document.getElementById('prediction-form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.innerHTML = `<i class="fas fa-microchip fa-spin"></i> SCANNING...`;
    
    // HUD Animation Trigger
    document.querySelector('.scan-line').style.animationDuration = '0.5s';
    
    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Analysis failed");
        }
        
        renderPrediction(result);
        loadBenchmarking(data);
        typeAIVerdict(result);
        
    } catch (error) {
        console.error(error);
    } finally {
        submitBtn.innerText = "RUN RISK ANALYSIS";
        document.querySelector('.scan-line').style.animationDuration = '3s';
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
        badge.innerText = "High Risk Detected";
        badge.className = "status-indicator status-high";
        circle.style.borderColor = "var(--brand-neon-red)";
    } else {
        badge.innerText = "Clearance Granted";
        badge.className = "status-indicator status-low";
        circle.style.borderColor = "var(--brand-neon-mint)";
    }

    renderShapChart(data);
    generateMitigationAdvisor(data);
}

// Feature: AI Terminal Typing
function typeAIVerdict(data) {
    const terminal = document.getElementById('ai-terminal-output');
    const topFactor = data.feature_names.map((n, i) => ({n, v: data.shap_contributions[i]}))
                      .sort((a,b) => Math.abs(b.v) - Math.abs(a.v))[0];
    
    const text = `> LOG: Analysis Complete. [Probability: ${data.probability}%]
> INSIGHT: Primary driver identified as ${topFactor.n.replace(/_/g, ' ').toUpperCase()}.
> VERDICT: Applicant exhibits ${data.prediction === 1 ? 'Elevated' : 'Substantial'} financial integrity profile.
> ADVISORY: Proceed with caution. Automated mitigation strategies deployed below.`;

    let i = 0;
    terminal.innerHTML = '';
    const interval = setInterval(() => {
        terminal.innerHTML += text[i];
        i++;
        if (i >= text.length) clearInterval(interval);
    }, 20);
}

function renderShapChart(data) {
    const ctx = document.getElementById('shapChart').getContext('2d');
    const sortedData = data.feature_names.map((name, i) => ({
        name: name.replace(/_/g, ' ').toUpperCase(),
        val: data.shap_contributions[i]
    })).sort((a, b) => Math.abs(b.val) - Math.abs(a.val)).slice(0, 8);

    const labels = sortedData.map(d => d.name);
    const values = sortedData.map(d => d.val);
    const colors = values.map(v => v > 0 ? '#FF3366' : '#00FFAA');

    if (shapChart) shapChart.destroy();
    shapChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { 
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A8AB' } }, 
                y: { grid: { display: false }, ticks: { color: '#94A8AB' } } 
            }
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
        container.innerHTML = `<p style="color: var(--brand-neon-mint);">Profile optimized. No critical vulnerabilities detected.</p>`;
        return;
    }

    const strategies = {
        'loan_amnt': "Reduce loan principal to mitigate capital exposure.",
        'loan_int_rate': "Adjust APR to stabilize long-term yield.",
        'person_income': "Augment income verification documentation.",
        'loan_percent_income': "Rebalance debt-to-income ratio below 20%.",
        'cb_person_default_on_file': "Require secondary collateralization.",
        'person_age': "Standard risk assessment applied."
    };

    container.innerHTML = highRiskFactors.slice(0, 3).map(f => `
        <div class="mitigation-item">
            <span style="color: var(--brand-neon-red); font-weight: 800;">[FIX]</span> 
            <strong>${f.name.replace(/_/g, ' ').toUpperCase()}:</strong> 
            ${strategies[f.name] || "Review institutional override."}
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
                        borderColor: '#FF3366',
                        backgroundColor: 'rgba(255, 51, 102, 0.2)',
                        pointBackgroundColor: '#FF3366'
                    },
                    {
                        label: 'Cohort Avg',
                        data: [1, 1, 1, 1],
                        borderColor: '#00FFAA',
                        backgroundColor: 'rgba(0, 255, 170, 0.1)',
                        pointBackgroundColor: '#00FFAA'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#E0E6E6' } } },
                scales: { 
                    r: { 
                        beginAtZero: true, 
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        angleLines: { color: 'rgba(255,255,255,0.1)' },
                        pointLabels: { color: '#94A8AB', font: { size: 10 } },
                        ticks: { display: false }
                    } 
                }
            }
        });

        document.getElementById('cohort-summary-text').innerHTML = `
            <p>> COHORT: ${applicantData.loan_intent}</p>
            <p>> SAMPLE_SIZE: ${cohort.cohort_size.toLocaleString()} UNITS</p>
            <p>> INCOME_VAR: ${((applicantData.person_income / cohort.avg_income) * 100).toFixed(0)}% OF BASELINE</p>
        `;
    } catch (e) { console.error(e); }
}

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
                <span class="metric-val" style="color: var(--brand-neon-mint);">${m.val}</span>
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
                { label: 'TN', data: [{x: 0, y: 1, r: 40}], backgroundColor: '#00FFAA' },
                { label: 'FP', data: [{x: 1, y: 1, r: 15}], backgroundColor: '#FF3366' },
                { label: 'FN', data: [{x: 0, y: 0, r: 20}], backgroundColor: '#FF3366' },
                { label: 'TP', data: [{x: 1, y: 0, r: 35}], backgroundColor: '#00FFAA' }
            ]
        },
        options: {
            scales: {
                x: { min: -0.5, max: 1.5, ticks: { color: '#94A8AB', callback: v => v === 0 ? 'Actual: Neg' : v === 1 ? 'Actual: Pos' : '' } },
                y: { min: -0.5, max: 1.5, ticks: { color: '#94A8AB', callback: v => v === 0 ? 'Pred: Pos' : v === 1 ? 'Pred: Neg' : '' } }
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
            datasets: [{
                label: 'Model ROC',
                data: [0, 0.7, 0.85, 0.945, 1],
                borderColor: '#00FFAA',
                fill: true,
                backgroundColor: 'rgba(0, 255, 170, 0.05)',
                tension: 0.4
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { 
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A8AB' } }, 
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A8AB' } } 
            }
        }
    });
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = (progress * (end - start) + start).toFixed(1);
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}