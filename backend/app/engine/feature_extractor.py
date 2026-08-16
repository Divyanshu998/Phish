import re
import math
from urllib.parse import urlparse

SUSPICIOUS_TLDS = {
    "xyz", "top", "work", "cn", "zip", "tk", "ml", "ga", "cf", "gq", 
    "link", "click", "site", "online", "live", "space", "monster", "icu", "cam"
}

SUSPICIOUS_KEYWORDS = [
    "login", "signin", "verify", "verification", "update", "account", "bank",
    "banking", "secure", "confirm", "password", "credential", "paypal", "apple",
    "google", "microsoft", "chase", "meta", "wallet", "support", "security",
    "auth", "billing", "service"
]

def calculate_entropy(text: str) -> float:
    if not text:
        return 0.0
    entropy = 0.0
    length = len(text)
    prob_dict = {}
    for char in text:
        prob_dict[char] = prob_dict.get(char, 0) + 1
    for count in prob_dict.values():
        p = count / length
        entropy -= p * math.log2(p)
    return round(entropy, 4)

def extract_features(url_str: str) -> dict:
    formatted_url = url_str if re.match(r'^[a-zA-Z]+://', url_str) else f"http://{url_str}"
    parsed = urlparse(formatted_url)
    
    hostname = parsed.hostname or ""
    full_url = parsed.geturl()

    ip_pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
    has_ip_host = bool(re.match(ip_pattern, hostname))

    parts = hostname.split('.')
    num_subdomains = max(0, len(parts) - 2) if not has_ip_host else 0

    tld = parts[-1].lower() if len(parts) > 1 and not has_ip_host else ""
    is_suspicious_tld = tld in SUSPICIOUS_TLDS

    url_lower = full_url.lower()
    matched_keywords = [kw for kw in SUSPICIOUS_KEYWORDS if kw in url_lower]

    return {
        "url_length": len(full_url),
        "hostname_length": len(hostname),
        "num_subdomains": num_subdomains,
        "has_ip_host": has_ip_host,
        "num_dots": full_url.count('.'),
        "num_hyphens": full_url.count('-'),
        "num_at": full_url.count('@'),
        "num_digits": sum(c.isdigit() for c in full_url),
        "entropy": calculate_entropy(hostname),
        "is_https": parsed.scheme.lower() == "https",
        "suspicious_tld": is_suspicious_tld,
        "suspicious_keywords_count": len(matched_keywords),
        "matched_keywords": matched_keywords,
        "hostname": hostname,
        "tld": tld
    }
