document.getElementById('prediction-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('span');
    
    // UI Loading State
    btnText.innerText = "Analyzing Risk Profile...";
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Server Error");
        }

        const result = await response.json();
        displayResults(result);
        
        // Scroll to results smoothly
        document.getElementById('result-section').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error("Error:", error);
        alert(`Assessment failed: ${error.message}`);
    } finally {
        btnText.innerText = "Analyze Risk Profile";
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});

function displayResults(data) {
    const resultSection = document.getElementById('result-section');
    const resultCard = document.querySelector('.result-card');
    const predText = document.getElementById('prediction-text');
    const riskPercent = document.getElementById('risk-percent');
    const chartDiv = document.getElementById('explanation-chart');

    resultSection.classList.remove('hidden');
    
    // Animate the probability number
    animateValue(riskPercent, 0, data.probability, 1000);

    if (data.prediction === 1) {
        predText.innerText = "High Risk Assessment";
        resultCard.className = "result-card risk-high";
    } else {
        predText.innerText = "Low Risk Verified";
        resultCard.className = "result-card risk-low";
    }

    // Build the XAI Bar Chart
    chartDiv.innerHTML = "";
    
    // Sort contributions by absolute value to show most important features first
    const features = data.feature_names.map((name, i) => ({
        name: name.replace(/_/g, ' ').toUpperCase(),
        val: data.shap_contributions[i]
    })).sort((a, b) => Math.abs(b.val) - Math.abs(a.val));

    features.forEach((feature) => {
        // Find max absolute value for normalization if needed, but 50 is a good baseline scaling
        const weight = Math.min(Math.abs(feature.val) * 60, 100); 
        const color = feature.val > 0 ? "var(--danger)" : "var(--primary)";

        const barHtml = `
            <div class="bar-container">
                <div class="bar-label">${feature.name} (${feature.val.toFixed(3)})</div>
                <div class="bar-outer">
                    <div class="bar-inner" style="width: 0%; background-color: ${color};"></div>
                </div>
            </div>
        `;
        chartDiv.insertAdjacentHTML('beforeend', barHtml);
        
        // Minor timeout to trigger CSS transition
        setTimeout(() => {
            const lastBar = chartDiv.querySelector('.bar-container:last-child .bar-inner');
            lastBar.style.width = `${weight}%`;
            lastBar.style.boxShadow = `0 0 15px ${color}44`;
        }, 50);
    });
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = (progress * (end - start) + start).toFixed(2);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}