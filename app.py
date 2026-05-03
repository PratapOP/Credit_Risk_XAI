from flask import Flask, render_template, request, jsonify
import pickle
import pandas as pd
import numpy as np

app = Flask(__name__)

# 1. LOAD THE MODELS
try:
    model = pickle.load(open('models/model.pkl', 'rb'))
    explainer = pickle.load(open('models/explainer.pkl', 'rb'))
    print("AI Model and Explainer loaded successfully.")
except Exception as e:
    print(f"CRITICAL ERROR LOADING MODELS: {e}")

@app.route('/')
def index():
    """Renders the main HTML page."""
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    """
    Handles the prediction request from the JS frontend.
    """
    try:
        data = request.json
        
        # 2. FEATURE ALIGNMENT
        feature_order = [
            'person_age', 'person_income', 'person_home_ownership', 
            'person_emp_length', 'loan_intent', 'loan_grade', 
            'loan_amnt', 'loan_int_rate', 'loan_percent_income', 
            'cb_person_default_on_file', 'cb_person_cred_hist_length'
        ]
        
        # Basic Validation
        required_fields = set(feature_order)
        if not required_fields.issubset(data.keys()):
            return jsonify({'error': 'Missing required fields'}), 400

        # Create DataFrame and enforce column order
        input_df = pd.DataFrame([data])
        
        # Ensure numeric conversion (since some might come as strings from JSON/Select)
        for col in feature_order:
            input_df[col] = pd.to_numeric(input_df[col])

        input_df = input_df[feature_order]
        
        # 3. PREDICTION
        prediction = int(model.predict(input_df)[0])
        probability = float(model.predict_proba(input_df)[0][1])
        
        # 4. EXPLAINABLE AI (SHAP)
        shap_vals = explainer.shap_values(input_df)
        
        if isinstance(shap_vals, list):
            # For Binary Classification, SHAP often returns a list [neg_class_shap, pos_class_shap]
            # We want the contributions towards the positive class (Probability of Default)
            contributions = shap_vals[1][0].tolist() if len(shap_vals) > 1 else shap_vals[0].tolist()
        else:
            # For some XGBoost versions, it might be a single array
            contributions = shap_vals[0].tolist()

        # 5. RETURN RESULTS
        return jsonify({
            'prediction': prediction,
            'probability': round(probability * 100, 2),
            'shap_contributions': contributions,
            'feature_names': feature_order
        })
        
    except Exception as e:
        print(f"\n--- ERROR DURING PREDICTION ---\n{str(e)}\n-------------------------------\n")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)