import pandas as pd
df = pd.read_csv('data/credit_risk_dataset.csv')
with open('mappings.txt', 'w') as f:
    f.write(f"person_home_ownership: {sorted(df['person_home_ownership'].unique())}\n")
    f.write(f"loan_intent: {sorted(df['loan_intent'].unique())}\n")
    f.write(f"cb_person_default_on_file: {sorted(df['cb_person_default_on_file'].unique())}\n")
