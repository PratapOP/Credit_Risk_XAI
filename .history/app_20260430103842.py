from flask import Flask, render_template, request, jsonify
import pickle
import pandas as pd
import numpy as np

app = Flask(__name__)

# 1. LOAD THE MODELS
# Load the trained model and SHAP explainer generated from your notebook
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
        # Get JSON data from the request
        data = request.json
        
        # 2. FEATURE ALIGNMENT
        # These MUST match the order used during model.fit() in your notebook
        feature_order = [
            'person_age', 'person_income', 'person_home_ownership', 
            'person_emp_length', 'loan_intent', 'loan_amnt', 
            'loan_int_rate', 'loan_percent_income', 
            'cb_person_default_on_file', 'cb_person_cred_hist_length'
        ]
        
        # Create DataFrame and enforce column order
        input_df = pd.DataFrame([data])
        input_df = input_df[feature_order]
        
        # 3. PREDICTION
        # Get binary class (0 or 1) and probability of default
        prediction = int(model.predict(input_df)[0])
        probability = float(model.predict_proba(input_df)[0][1])
        
        # 4. EXPLAINABLE AI (SHAP)
        # Calculate SHAP values for this specific input instance
        shap_vals = explainer.shap_values(input_df)
        
        # Ensure the contributions are in a list format for JSON serialization
        # (Handles variations in SHAP/XGBoost output versions)
        if isinstance(shap_vals, list):
            contributions = shap_vals[0].tolist()
        else:
            contributions = shap_vals[0].tolist()

        # 5. RETURN RESULTS
        return jsonify({
            'prediction': prediction,
            'probability': round(probability * 100, 2),
            'shap_contributions': contributions,
            'feature_names': feature_order
        })
        
    except Exception as e:
        # If an error occurs, print it to the terminal for debugging
        print("\n--- ERROR DURING PREDICTION ---")
        print(str(e))
        print("-------------------------------\n")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Using debug=True allows for auto-reloading during development
    app.run(debug=True, port=5000)