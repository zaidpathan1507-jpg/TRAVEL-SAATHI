export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
}

export type SOSStage = 'idle' | 'confirming' | 'countdown' | 'active';

export type SOSLocationStatus = 'detecting' | 'detected' | 'denied' | 'unavailable' | 'unsupported';

export interface SOSLocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface NearbyEmergencyFacility {
  id: string;
  name: string;
  type: 'hospital' | 'police' | 'emergency';
  distanceKm: number;
  latitude: number;
  longitude: number;
  address?: string;
  isOpen?: boolean;
}
