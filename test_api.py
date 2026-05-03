import requests
data = {
    "person_age": 25,
    "person_income": 50000,
    "person_home_ownership": 3,
    "person_emp_length": 2,
    "loan_intent": 1,
    "loan_grade": 0,
    "loan_amnt": 10000,
    "loan_int_rate": 11.0,
    "loan_percent_income": 0.2,
    "cb_person_default_on_file": 1,
    "cb_person_cred_hist_length": 3
}
try:
    r = requests.post("http://127.0.0.1:5000/predict", json=data)
    print(r.status_code)
    print(r.json())
except Exception as e:
    print(f"Error: {e}")
