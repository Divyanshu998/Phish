from typing import List, Dict, Any

POPULAR_BRANDS = [
    "paypal", "apple", "google", "microsoft", "amazon", "netflix",
    "chase", "wellsfargo", "bankofamerica", "facebook", "meta", "instagram",
    "binance", "coinbase", "stripe", "dropbox", "docusign"
]

def analyze_heuristics(url: str, features: Dict[str, Any]) -> List[str]:
    risk_factors = []
    hostname = features.get("hostname", "").lower()

    if features.get("has_ip_host"):
        risk_factors.append("IP address host detected instead of domain name")

    matched_brands = [brand for brand in POPULAR_BRANDS if brand in hostname]
    if matched_brands:
        is_official = any(hostname == f"{brand}.com" or hostname.endswith(f".{brand}.com") for brand in matched_brands)
        if not is_official:
            brand_str = ", ".join(matched_brands).upper()
            risk_factors.append(f"Domain impersonation pattern detected targeting {brand_str}")

    matched_kws = features.get("matched_keywords", [])
    if matched_kws:
        kw_str = ", ".join(matched_kws[:3])
        risk_factors.append(f"Suspicious authentication keyword(s) detected: [{kw_str}]")

    num_subdomains = features.get("num_subdomains", 0)
    if num_subdomains >= 3:
        risk_factors.append(f"Excessive subdomain depth ({num_subdomains} subdomains)")

    if features.get("suspicious_tld"):
        tld = features.get("tld", "")
        risk_factors.append(f"High-risk top-level domain extension (.{tld})")

    if features.get("num_at", 0) > 0:
        risk_factors.append("URL contains '@' user obfuscation symbol")

    if not features.get("is_https") and len(matched_kws) > 0:
        risk_factors.append("Insecure HTTP connection paired with credential/login keywords")

    entropy = features.get("entropy", 0.0)
    if entropy > 4.2 and not features.get("has_ip_host"):
        risk_factors.append(f"High entropy/randomized domain structure (Entropy score: {entropy})")

    if features.get("num_hyphens", 0) >= 3:
        risk_factors.append("Excessive hyphens commonly used in domain typosquatting")

    return risk_factors
