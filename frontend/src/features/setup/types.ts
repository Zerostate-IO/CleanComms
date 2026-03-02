/**
 * Setup Flow Types
 * Types for guided radio setup workflow
 */

// Radio catalog types (matching data/radios/schema/radio-capability.schema.json)

export interface RadioIdentity {
  manufacturer: string;
  model: string;
  model_code: string;
  aliases?: string[];
  hamlib_model_id?: number;
  introduction_year?: number;
}

export interface SerialConfig {
  default_baud: number;
  supported_baud_rates: number[];
  data_bits: 7 | 8;
  stop_bits: 1 | 2;
  parity: 'none' | 'even' | 'odd';
  flow_control: 'none' | 'hardware' | 'software';
}

export interface MeteringCapabilities {
  smeter: boolean;
  power_output: boolean;
  swr: boolean;
  alc: boolean;
}

export interface CATCapabilities {
  frequency_control: boolean;
  mode_control: boolean;
  vfo_control: boolean;
  split_control: boolean;
  filter_control: boolean;
  agc_control: boolean;
  power_control: boolean;
  antenna_control: boolean;
  metering: MeteringCapabilities;
  memory_channels: boolean;
  extended_commands?: string[];
  unsupported_commands?: string[];
}

export interface PTTCapabilities {
  cat_ptt: boolean;
  rts_ptt: boolean;
  dtr_ptt: boolean;
  hardware_ptt: boolean;
  vox: boolean;
  ptt_timeout_ms?: number;
  ptt_delay_ms?: number;
}

export interface AudioCapabilities {
  usb_audio: boolean;
  audio_input: 'usb' | 'acc-port' | 'mic-jack' | 'none';
  audio_output: 'usb' | 'acc-port' | 'speaker' | 'headphone' | 'none';
  cat_audio_streaming: boolean;
  acc_port: boolean;
  input_level_control: boolean;
  output_level_control: boolean;
  sample_rates?: number[];
}

export interface ProtocolProfile {
  protocol_type: string;
  description?: string;
  serial?: SerialConfig;
  cat?: CATCapabilities;
  ptt?: PTTCapabilities;
  audio?: AudioCapabilities;
  firmware_minimum?: string;
  firmware_maximum?: string;
}

export interface RadioCatalogEntry {
  schema_version: string;
  identity: RadioIdentity;
  support_tier: 1 | 2;
  protocol_profiles: Record<string, ProtocolProfile>;
  recommendations?: {
    preferred_profile?: string;
    fallback_profile?: string;
    notes?: string;
  };
}

// User profile types

export interface SerialPortConfig {
  path: string;
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'even' | 'odd';
  flowControl: 'none' | 'hardware' | 'software';
}

export interface AudioDeviceConfig {
  inputDeviceId: string;
  outputDeviceId: string;
  inputVolume: number;
  outputVolume: number;
}

export type PTTMethod = 'cat' | 'rts' | 'dtr' | 'hardware' | 'vox';

export interface SetupProfile {
  radioModelCode: string;
  radioModel: string;
  radioManufacturer: string;
  protocolProfile: string;
  serialConfig: SerialPortConfig;
  audioConfig: AudioDeviceConfig;
  pttMethod: PTTMethod;
  createdAt: string;
  updatedAt: string;
}

// Setup flow state types

export type SetupStep = 'radio' | 'serial' | 'audio' | 'review';

export interface SetupStepStatus {
  id: SetupStep;
  label: string;
  completed: boolean;
  hasError: boolean;
}

export interface ValidationErrors {
  radioModelCode?: string;
  'serialConfig.path'?: string;
  'serialConfig.baudRate'?: string;
  'audioConfig.inputDeviceId'?: string;
  'audioConfig.outputDeviceId'?: string;
  pttMethod?: string;
}

// Serial port detection types

export interface DetectedPort {
  path: string;
  manufacturer?: string;
  product?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
}

// Audio device types

export interface AudioDevice {
  deviceId: string;
  kind: 'audioinput' | 'audiooutput';
  label: string;
}
