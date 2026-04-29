document.getElementById('prediction-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // Convert string inputs to numbers
    for (let key in data) {
        data[key] = parseFloat(data[key]);
    }

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.innerText = "Analyzing Risk...";
    submitBtn.disabled = true;

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        displayResults(result);
    } catch (error) {
        console.error("Error:", error);
        alert("Something went wrong with the prediction.");
    } finally {
        submitBtn.innerText = "Analyze Credit Risk";
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
    riskPercent.innerText = data.probability;

    if (data.prediction === 1) {
        predText.innerText = "High Risk (Rejected)";
        predText.style.color = "#dc2626";
        resultCard.className = "result-card risk-high";
    } else {
        predText.innerText = "Low Risk (Approved)";
        predText.style.color = "#16a34a";
        resultCard.className = "result-card risk-low";
    }

    // Build the XAI Bar Chart
    chartDiv.innerHTML = ""; // Clear old chart
    data.feature_names.forEach((name, index) => {
        const val = data.shap_contributions[index];
        const width = Math.min(Math.abs(val) * 50, 100); // Scaling for UI
        const color = val > 0 ? "#dc2626" : "#2563eb"; // Red for risk-up, Blue for risk-down

        chartDiv.innerHTML += `
            <div class="bar-container">
                <div class="bar-label">${name.replace(/_/g, ' ')} (${val.toFixed(2)})</div>
                <div class="bar-outer">
                    <div class="bar-inner" style="width: ${width}%; background-color: ${color};"></div>
                </div>
            </div>
        `;
    });
}