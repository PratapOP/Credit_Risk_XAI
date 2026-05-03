# TrustScore AI | Advanced Credit Risk XAI

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.8%2B-green.svg)
![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)

**TrustScore AI** is a professional-grade Explainable Artificial Intelligence (XAI) application designed to assess credit risk for loan applications. By leveraging Gradient Boosting (XGBoost) and SHAP (SHapley Additive exPlanations), the system provides not only a risk probability but also a transparent breakdown of the factors influencing every decision.

## ✨ Features

- **Institutional Design**: A premium, dark-mode interface featuring glassmorphism and modern typography for a high-end financial tool feel.
- **Explainable Predictions (XAI)**: Real-time generation of SHAP influence charts, showing exactly how each input feature (e.g., income, home ownership) contributed to the final risk score.
- **Micro-Animations**: Smooth UI transitions, including animated probability counters and interactive XAI bar charts.
- **Categorical Intelligence**: Intuitive dropdowns for categorical data with high-performance server-side encoding.
- **Robust Validation**: Comprehensive input validation to ensure reliable model inference.

## 🚀 Getting Started

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/Credit_Risk_XAI.git
   cd Credit_Risk_XAI
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**:
   ```bash
   python app.py
   ```
4. **Access the UI**:
   Open your browser and navigate to `http://127.0.0.1:5000`

## 🧠 Technical Architecture

- **Backend**: Python / Flask
- **Frontend**: Vanilla JavaScript (ES6+), Modern CSS (Flexbox/Grid), HTLM5
- **Machine Learning**: 
  - **Model**: Extreme Gradient Boosting (XGBoost)
  - **Explainability**: SHAP (TreeExplainer)
  - **Data Source**: [Kaggle Credit Risk Dataset](https://www.kaggle.com/datasets/laotse/credit-risk-dataset)
- **Key Features Analyzed**: 
  - Applicant demographics (Age, Income, Home Ownership, Employment History)
  - Loan specifics (Intent, Grade, Amount, Interest Rate, Percent Income)
  - Credit history (Prior Defaults, History Length)

## 📊 XAI Methodology
TrustScore AI uses **SHAP values** to solve the "black box" problem in AI. For every prediction, the system calculates the marginal contribution of each feature toward the final probability. 
- **Red Bars (High Risk)**: Features that pushed the probability toward a "Default" assessment.
- **Blue Bars (Low Risk)**: Features that protected the applicant's creditworthiness and lowered the risk score.

## 🛠️ Project Structure
```text
├── app.py              # Flask server and API endpoints
├── models/             # Pre-trained XGBoost model and Explainer
├── static/
│   ├── css/            # Premium styles and layout
│   └── js/             # UI logic and XAI chart rendering
├── templates/
│   └── index.html      # Main application interface
├── notebooks/          # Training and EDA pipelines
└── requirements.txt    # Dependency list
```

## 📜 License
This project is licensed under the MIT License - see the LICENSE file for details.
