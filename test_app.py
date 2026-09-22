"""
CardioAI — Automated Test Suite
Tests Flask REST API routes, ML model predictions, and data validation rules.
"""

import unittest
import json
from app import app

class CardioAITestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_homepage_route(self):
        """Test static index.html delivery."""
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'CardioAI', response.data)

    def test_models_api_route(self):
        """Test /api/models endpoint returns all 4 classifiers."""
        response = self.app.get('/api/models')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('models', data)
        self.assertEqual(len(data['models']), 4)

    def test_login_api(self):
        """Test /api/login endpoint with valid and invalid credentials."""
        # Test valid credentials
        res = self.app.post('/api/login', data=json.dumps({"email": "dr.smith@cardioai.med", "password": "cardio2025"}), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])

        # Test invalid credentials
        res_invalid = self.app.post('/api/login', data=json.dumps({"email": "dr.smith@cardioai.med", "password": "wrongpassword"}), content_type='application/json')
        self.assertEqual(res_invalid.status_code, 401)

    def test_predict_api_low_risk(self):
        """Test /api/predict for a healthy patient profile."""
        payload = {
            "age": 30,
            "gender": "female",
            "bp": 115,
            "chol": 170,
            "hr": 155,
            "sugar": 90,
            "diabetes": "no",
            "smoking": "no",
            "cp": 3,
            "exang": "no",
            "algorithm": "rf"
        }
        response = self.app.post('/api/predict', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('riskPercentage', data)
        self.assertIn('category', data)
        self.assertLess(data['riskPercentage'], 40)
        self.assertEqual(data['category'], "Low Risk")

    def test_predict_api_high_risk(self):
        """Test /api/predict for an elevated risk patient profile."""
        payload = {
            "age": 68,
            "gender": "male",
            "bp": 175,
            "chol": 310,
            "hr": 95,
            "sugar": 160,
            "diabetes": "yes",
            "smoking": "yes",
            "cp": 0,
            "exang": "yes",
            "algorithm": "svm"
        }
        response = self.app.post('/api/predict', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('riskPercentage', data)
        self.assertGreaterEqual(data['riskPercentage'], 60)

if __name__ == '__main__':
    unittest.main()
