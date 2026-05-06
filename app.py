import json
import os
from flask import Flask, render_template, request, jsonify
import pickle
import pandas as pd
import numpy as np

app = Flask(__name__)

# --- CONSTANTS & CONFIGURATION ---
DATA_DIR = 'data'
METRICS_FILE = os.path.join(DATA_DIR, 'metrics.json')

# Mappings based on model training standards
MAPPINGS = {
    'person_home_ownership': {'MORTGAGE': 0, 'OTHER': 1, 'OWN': 2, 'RENT': 3},
    'loan_intent': {
        'DEBTCONSOLIDATION': 0, 'EDUCATION': 1, 'HOMEIMPROVEMENT': 2, 
        'MEDICAL': 3, 'PERSONAL': 4, 'VENTURE': 5
    },
    'cb_person_default_on_file': {'N': 0, 'Y': 1},
    'loan_grade': {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6}
}

VALIDATION_RANGES = {
    'person_age': (18, 95),
    'person_income': (1, 5000000),
    'person_emp_length': (0, 60),
    'loan_amnt': (500, 100000),
    'loan_int_rate': (0.1, 35.0),
    'loan_percent_income': (0.0, 1.0),
    'cb_person_cred_hist_length': (0, 40)
}

# --- MODEL LOADING ---
try:
    model = pickle.load(open('models/model.pkl', 'rb'))
    explainer = pickle.load(open('models/explainer.pkl', 'rb'))
    print("AI Model and Explainer loaded successfully.")
except Exception as e:
    print(f"CRITICAL ERROR LOADING MODELS: {e}")
    model = None
    explainer = None

def preprocess_input(data):
    """
    Validates and transforms raw frontend data into model-ready format.
    """
    processed = {}
    errors = []

    # 1. Feature Alignment Order
    feature_order = [
        'person_age', 'person_income', 'person_home_ownership', 
        'person_emp_length', 'loan_intent', 'loan_grade', 
        'loan_amnt', 'loan_int_rate', 'loan_percent_income', 
        'cb_person_default_on_file', 'cb_person_cred_hist_length'
    ]

    for col in feature_order:
        val = data.get(col)
        if val is None:
            errors.append(f"Missing field: {col}")
            continue

        # 2. Categorical Mapping
        if col in MAPPINGS:
            # Handle both strings (from new UI) and legacy integers
            if isinstance(val, str) and val.upper() in MAPPINGS[col]:
                processed[col] = MAPPINGS[col][val.upper()]
            elif str(val).isdigit() and int(val) in MAPPINGS[col].values():
                processed[col] = int(val)
            else:
                errors.append(f"Invalid categorical value for {col}: {val}")
        
        # 3. Numeric Validation
        else:
            try:
                num_val = float(val)
                min_v, max_v = VALIDATION_RANGES.get(col, (-float('inf'), float('inf')))
                if not (min_v <= num_val <= max_v):
                    errors.append(f"{col} out of range ({min_v} - {max_v})")
                processed[col] = num_val
            except ValueError:
                errors.append(f"Invalid numeric value for {col}: {val}")

    return processed, errors, feature_order

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if model is None or explainer is None:
        return jsonify({'error': 'Model service unavailable'}), 503

    try:
        raw_data = request.json
        processed_data, errors, feature_order = preprocess_input(raw_data)
        
        if errors:
            return jsonify({'error': 'Validation Failed', 'details': errors}), 400

        # Create DataFrame and enforce column order
        input_df = pd.DataFrame([processed_data])[feature_order]
        
        # 3. PREDICTION
        prediction = int(model.predict(input_df)[0])
        probability = float(model.predict_proba(input_df)[0][1])
        
        # 4. EXPLAINABLE AI (SHAP)
        shap_vals = explainer.shap_values(input_df)
        
        if isinstance(shap_vals, list):
            contributions = shap_vals[1][0].tolist() if len(shap_vals) > 1 else shap_vals[0].tolist()
        else:
            contributions = shap_vals[0].tolist()

        return jsonify({
            'prediction': prediction,
            'probability': round(probability * 100, 2),
            'shap_contributions': contributions,
            'feature_names': feature_order
        })
        
    except Exception as e:
        app.logger.error(f"Prediction Error: {str(e)}")
        return jsonify({'error': 'Internal analysis error'}), 500

@app.route('/metrics')
def get_metrics():
    try:
        with open(METRICS_FILE, 'r') as f:
            data = json.load(f)
        return jsonify(data['metrics'])
    except Exception as e:
        return jsonify({'error': 'Could not load metrics'}), 500

@app.route('/global-importance')
def get_global_importance():
    try:
        with open(METRICS_FILE, 'r') as f:
            data = json.load(f)
        return jsonify(data['global_importance'])
    except Exception as e:
        return jsonify({'error': 'Could not load importance data'}), 500

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'explainer_loaded': explainer is not None
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
