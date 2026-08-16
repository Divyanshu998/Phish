import { ScanResult } from '../types';

export async function checkBackendHealth(baseUrl: string = 'http://localhost:8000'): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'healthy';
  } catch (e) {
    return false;
  }
}

export async function executeExtensionScan(
  url: string, 
  baseUrl: string = 'http://localhost:8000',
  browserName: string = 'chrome'
): Promise<ScanResult> {
  const response = await fetch(`${baseUrl}/api/extension/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      url: url,
      source: 'browser_extension',
      browser: browserName
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Scan request failed (${response.status}): ${errText}`);
  }

  return await response.json();
}
