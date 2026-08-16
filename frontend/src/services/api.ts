import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export interface ScanRecord {
  scan_id: string;
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

export interface KPIData {
  total_scans: number;
  threats_detected: number;
  critical_threats: number;
  extension_scans: number;
}

export interface LiveExtensionActivityItem {
  scan_id: string;
  timestamp: string;
  browser: string;
  url: string;
  domain: string;
  classification: string;
  risk_score: number;
}

export interface ExtensionStatusData {
  status: string;
  version: string;
  last_scan_timestamp?: string;
  total_extension_scans: number;
  threats_detected: number;
  critical_threats: number;
}

export interface NetworkNode {
  id: string;
  label: string;
  type: string;
  risk_score?: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface ThreatNetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export const apiService = {
  async getHealth() {
    const res = await client.get('/health');
    return res.data;
  },

  async scanUrl(url: string, source: string = 'dashboard'): Promise<ScanRecord> {
    const res = await client.post('/scan', { url, source, browser: 'chrome' });
    return res.data;
  },

  async getScans(limit: number = 50, source?: string, classification?: string): Promise<ScanRecord[]> {
    const res = await client.get('/scans', {
      params: { limit, source, classification }
    });
    return res.data;
  },

  async getScanById(scanId: string): Promise<ScanRecord> {
    const res = await client.get(`/scans/${scanId}`);
    return res.data;
  },

  async getKPIs(): Promise<KPIData> {
    const res = await client.get('/analytics/kpis');
    return res.data;
  },

  async getLiveExtensionActivity(): Promise<LiveExtensionActivityItem[]> {
    const res = await client.get('/analytics/live-extension-activity');
    return res.data;
  },

  async getThreatDistribution(): Promise<Record<string, number>> {
    const res = await client.get('/dashboard/threat-distribution');
    return res.data;
  },

  async getSourcesDistribution(): Promise<Record<string, number>> {
    const res = await client.get('/dashboard/sources');
    return res.data;
  },

  async getExtensionStatus(): Promise<ExtensionStatusData> {
    const res = await client.get('/extension/status');
    return res.data;
  },

  async getThreatNetwork(): Promise<ThreatNetworkData> {
    const res = await client.get('/analytics/threat-network');
    return res.data;
  }
};
