export interface ScanResult {
  scan_id: str;
  url: string;
  domain: string;
  risk_score: number;
  classification: 'SAFE' | 'SUSPICIOUS' | 'HIGH RISK' | 'CRITICAL';
  ml_prediction: 'PHISHING' | 'LEGITIMATE';
  ml_confidence: number;
  risk_factors: string[];
  recommendation: string;
  source: string;
  browser?: string;
  timestamp: string;
  features?: Record<string, any>;
}

export type str = string;

export interface LocalScanItem {
  scan_id: string;
  url: string;
  domain: string;
  risk_score: number;
  classification: 'SAFE' | 'SUSPICIOUS' | 'HIGH RISK' | 'CRITICAL';
  timestamp: string;
}

export interface ExtensionSettings {
  apiServer: string;
  autoOpenReport: boolean;
  saveLocalHistory: boolean;
}
