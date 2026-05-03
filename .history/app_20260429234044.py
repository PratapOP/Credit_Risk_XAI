from flask import Flask, render_template, request, jsonify
import pickle
import pandas as pd
import numpy as np

app = Flask(__name__)

# 1. LOAD THE BRAIN
# We load the trained XGBoost model and the SHAP explainer we created in the notebook
try:
    model = pickle.load(open('models/model.pkl', 'rb'))
    explainer = pickle.load(open('models/explainer.pkl', 'rb'))
    print("AI Model and Explainer loaded successfully.")
except FileNotFoundError:
    print("Error: Model files not found. Please run the notebook first!")

@app.route('/')
def index():
    """Renders the main dashboard page."""
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    """
    Handles the prediction request.
    Receives JSON data from the frontend, predicts risk, 
    and generates XAI explanations.
    """
    # Get JSON data from JavaScript fetch request
    data = request.json
    
    # Convert input data into a DataFrame
    # Feature names must be in the exact same order as training
    feature_order = [
        'person_age', 'person_income', 'person_home_ownership', 
        'person_emp_length', 'loan_intent', 'loan_amnt', 
        'loan_int_rate', 'loan_percent_income', 
        'cb_person_default_on_file', 'cb_person_cred_hist_length'
    ]
    
    # Create the DataFrame using the ordered list
    input_df = pd.DataFrame([data], columns=feature_order)
    
    # 2. PREDICTION LOGIC
    # Get the binary prediction (0 or 1)
    prediction = int(model.predict(input_df)[0])
    
    # Get the probability of default (Class 1)
    # predict_proba returns [prob_of_0, prob_of_1]
    probability = float(model.predict_proba(input_df)[0][1])
    
    # 3. EXPLAINABLE AI LOGIC (SHAP)
    # SHAP calculates how much each feature contributed to this specific result
    shap_values = explainer.shap_values(input_df)
    
    # SHAP values can be negative (reduces risk) or positive (increases risk)
    # For XGBoost, shap_values is an array for the specific instance
    contributions = shap_values[0].tolist()

    # 4. SEND RESPONSE BACK TO FRONTEND
    return jsonify({
        'prediction': prediction,
        'probability': round(probability * 100, 2), # Convert to percentage
        'shap_contributions': contributions,
        'feature_names': feature_order
    })
    
    

if __name__ == '__main__':
    # Setting debug=True allows the server to auto-reload when you change code
    app.run(debug=True, port=5000)