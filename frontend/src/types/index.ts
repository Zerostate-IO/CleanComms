export interface WorkspaceTab {
  id: string;
  label: string;
  mode: 'USB' | 'LSB' | 'CW' | 'DIGI' | 'FM' | 'AM';
  frequency: number;
  isActive: boolean;
}

export interface RadioStatus {
  frequency: number;
  mode: string;
  ptt: boolean;
  connected: boolean;
}

export interface ModemStatus {
  mode: string;
  tx: boolean;
  connected: boolean;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  rigctld: string;
  fldigi: string;
  features: Record<string, boolean>;
  coordinator: string;
}
