import numpy as np
from sklearn.ensemble import RandomForestClassifier
from typing import Dict, Any, Tuple

class MLEngine:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=50, random_state=42)
        self._train_baseline_model()

    def _extract_feature_vector(self, features: Dict[str, Any]) -> np.ndarray:
        return np.array([[
            features.get("url_length", 0),
            features.get("hostname_length", 0),
            features.get("num_subdomains", 0),
            int(features.get("has_ip_host", False)),
            features.get("num_dots", 0),
            features.get("num_hyphens", 0),
            features.get("num_at", 0),
            features.get("num_digits", 0),
            features.get("entropy", 0.0),
            int(features.get("is_https", True)),
            int(features.get("suspicious_tld", False)),
            features.get("suspicious_keywords_count", 0)
        ]], dtype=float)

    def _train_baseline_model(self):
        X = []
        y = []

        # Legitimate samples
        for i in range(100):
            url_len = np.random.randint(15, 45)
            host_len = np.random.randint(8, 20)
            subdomains = np.random.choice([0, 1], p=[0.8, 0.2])
            ip_host = 0
            dots = np.random.randint(1, 3)
            hyphens = np.random.choice([0, 1], p=[0.85, 0.15])
            at_sym = 0
            digits = np.random.randint(0, 3)
            entropy = np.random.uniform(2.5, 3.8)
            is_https = 1
            susp_tld = 0
            kw_count = 0
            X.append([url_len, host_len, subdomains, ip_host, dots, hyphens, at_sym, digits, entropy, is_https, susp_tld, kw_count])
            y.append(0)

        # Phishing samples
        for i in range(100):
            url_len = np.random.randint(55, 120)
            host_len = np.random.randint(22, 50)
            subdomains = np.random.randint(2, 5)
            ip_host = np.random.choice([0, 1], p=[0.7, 0.3])
            dots = np.random.randint(3, 7)
            hyphens = np.random.randint(2, 6)
            at_sym = np.random.choice([0, 1], p=[0.8, 0.2])
            digits = np.random.randint(4, 15)
            entropy = np.random.uniform(4.0, 5.2)
            is_https = np.random.choice([0, 1], p=[0.6, 0.4])
            susp_tld = np.random.choice([0, 1], p=[0.5, 0.5])
            kw_count = np.random.randint(1, 4)
            X.append([url_len, host_len, subdomains, ip_host, dots, hyphens, at_sym, digits, entropy, is_https, susp_tld, kw_count])
            y.append(1)

        self.model.fit(X, y)

    def predict(self, features: Dict[str, Any]) -> Tuple[str, float]:
        vec = self._extract_feature_vector(features)
        probs = self.model.predict_proba(vec)[0]
        phishing_prob = probs[1]

        if features.get("has_ip_host") or features.get("num_at", 0) > 0:
            phishing_prob = max(phishing_prob, 0.88)
        if features.get("suspicious_keywords_count", 0) >= 2 and features.get("num_hyphens", 0) >= 2:
            phishing_prob = max(phishing_prob, 0.92)

        if phishing_prob >= 0.5:
            prediction = "PHISHING"
            confidence = round(float(phishing_prob), 4)
        else:
            prediction = "LEGITIMATE"
            confidence = round(float(probs[0]), 4)

        return prediction, confidence

ml_engine_instance = MLEngine()
