"""
CardioAI — Scikit-Learn Model Training Pipeline
Trains Random Forest, Support Vector Machine, Logistic Regression, and Decision Tree classifiers
on the Cleveland Heart Disease Dataset parameters and exports model weights using Joblib.
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, classification_report

def generate_cleveland_dataset(n_samples=1000):
    """Generates synthetic dataset following Cleveland Heart Disease distributions."""
    np.random.seed(42)

    age = np.random.normal(54, 9, n_samples).clip(20, 85)
    gender = np.random.choice([0, 1], p=[0.32, 0.68], size=n_samples) # 1 = male, 0 = female
    bp = np.random.normal(131, 17, n_samples).clip(90, 200)
    chol = np.random.normal(246, 50, n_samples).clip(120, 450)
    hr = np.random.normal(149, 22, n_samples).clip(60, 210)
    sugar = np.random.normal(120, 35, n_samples).clip(60, 300)
    diabetes = (sugar > 126).astype(int)
    smoking = np.random.choice([0, 1], p=[0.65, 0.35], size=n_samples)
    cp = np.random.choice([0, 1, 2, 3], p=[0.48, 0.17, 0.28, 0.07], size=n_samples)
    exang = np.random.choice([0, 1], p=[0.67, 0.33], size=n_samples)

    # Risk target formulation based on clinical weightings
    risk_score = (
        (age > 55) * 1.5 +
        (bp > 140) * 1.8 +
        (chol > 240) * 1.4 +
        (hr < 120) * 1.2 +
        diabetes * 1.6 +
        smoking * 1.5 +
        (cp == 0) * 2.2 +
        exang * 1.7 +
        np.random.normal(0, 1.2, n_samples)
    )

    target = (risk_score > 4.8).astype(int)

    df = pd.DataFrame({
        'age': age,
        'gender': gender,
        'bp': bp,
        'chol': chol,
        'hr': hr,
        'sugar': sugar,
        'diabetes': diabetes,
        'smoking': smoking,
        'cp': cp,
        'exang': exang,
        'target': target
    })

    return df

def train_and_export():
    print("=== CardioAI ML Model Training Pipeline ===")
    df = generate_cleveland_dataset(1200)

    X = df.drop(columns=['target'])
    y = df['target']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    models = {
        'rf': RandomForestClassifier(n_estimators=100, random_state=42),
        'svm': SVC(probability=True, kernel='rbf', random_state=42),
        'lr': LogisticRegression(max_iter=1000, random_state=42),
        'dt': DecisionTreeClassifier(max_depth=5, random_state=42)
    }

    trained_models = {}
    print("\nModel Performance Evaluation:")
    for name, model in models.items():
        if name in ['svm', 'lr']:
            model.fit(X_train_scaled, y_train)
            preds = model.predict(X_test_scaled)
        else:
            model.fit(X_train, y_train)
            preds = model.predict(X_test)

        acc = accuracy_score(y_test, preds)
        print(f"  [{name.upper()}] Accuracy: {acc * 100:.2f}%")
        trained_models[name] = model

    os.makedirs('models', exist_ok=True)
    artifacts = {
        'models': trained_models,
        'scaler': scaler,
        'feature_names': list(X.columns)
    }
    joblib.dump(artifacts, 'models/heart_model.pkl')
    print("\n[OK] Models successfully saved to models/heart_model.pkl\n")

if __name__ == '__main__':
    train_and_export()
