export type UserRole = 'super_admin' | 'company_admin' | 'individual_owner' | 'sub_user';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  roleName: string;
  tenantId: string;
  tenantName: string;
  tenantType: string;
  assigned_vehicles?: string[] | null;
}

export interface Vehicle {
  id: string;
  tenant_id: string;
  registration_number: string;
  category_id: string;
  category_name?: string;
  category_code?: string;
  make: string;
  model: string;
  manufacturing_year?: number;
  owner_name: string;
  owner_phone: string;
  emergency_contact_phone: string;
  photo_url?: string;
  device_id?: string;
  device_imei?: string;
  device_model?: string;
  device_status?: 'online' | 'offline' | 'tampered' | 'inactive';
  manufacturer_name?: string;
  is_ais140_compliant?: number;
  main_power_connected?: number;
  backup_battery_pct?: number;
  installation_date?: string;
  speed_limit: number;
  is_active: number;
  immobilisation_status: 'active' | 'immobilised' | 'pending';
  latitude?: number;
  longitude?: number;
  speed?: number;
  heading?: number;
  ignition?: number;
  movement_status?: 'moving' | 'stopped' | 'idle' | 'offline';
  address?: string;
  gps_time?: string;
  panic_status?: number;
}

export interface VehicleLocation {
  vehicle_id: string;
  registration_number: string;
  make: string;
  model: string;
  speed_limit: number;
  immobilisation_status: string;
  category_name: string;
  category_code: string;
  device_id: string;
  imei: string;
  device_status: string;
  main_power_connected: number;
  backup_battery_pct: number;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed: number;
  heading: number;
  ignition: number;
  movement_status: 'moving' | 'stopped' | 'idle' | 'offline';
  main_power: number;
  panic_status: number;
  address?: string;
  gps_time: string;
}

export interface PanicEvent {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  registration_number: string;
  category_name?: string;
  owner_name: string;
  owner_phone: string;
  emergency_contact_phone: string;
  device_imei: string;
  latitude: number;
  longitude: number;
  speed: number;
  address: string;
  event_time: string;
  status: 'New' | 'Acknowledged' | 'In Progress' | 'Resolved' | 'Closed';
  acknowledged_by?: string;
  acknowledged_by_name?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_by_name?: string;
  resolved_at?: string;
  remarks?: string;
  emergency_contact_notified: number;
}

export interface Trip {
  id: string;
  vehicle_id: string;
  registration_number: string;
  make: string;
  model: string;
  category_name: string;
  start_time: string;
  end_time: string;
  start_latitude: number;
  start_longitude: number;
  start_address: string;
  end_latitude: number;
  end_longitude: number;
  end_address: string;
  distance_km: number;
  duration_minutes: number;
  stoppage_minutes: number;
  stops_count: number;
  max_speed: number;
  avg_speed: number;
  is_inferred: number;
}

export interface Geofence {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  fence_type: 'circle' | 'polygon';
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  coordinates_json?: string;
  alert_on_entry: number;
  alert_on_exit: number;
  speed_limit?: number;
  is_active: number;
  assigned_vehicles?: { id: string; registration_number: string }[];
  event_count?: number;
}

export interface SecurityCommand {
  id: string;
  vehicle_id: string;
  registration_number: string;
  vehicle_model: string;
  device_imei: string;
  requested_by_user: string;
  command_type: 'IMMOBILISE' | 'RESTORE';
  status: 'PENDING' | 'SENT' | 'ACKNOWLEDGED' | 'EXECUTED' | 'REJECTED' | 'FAILED';
  safety_check_stationary: number;
  speed_at_request: number;
  reason: string;
  otp_verified: number;
  device_ack_response?: string;
  requested_at: string;
  executed_at?: string;
}

export interface GPSDevice {
  id: string;
  imei: string;
  manufacturer_name: string;
  manufacturer_code: string;
  model: string;
  sim_number?: string;
  firmware_version: string;
  is_ais140_compliant: number;
  status: 'online' | 'offline' | 'tampered' | 'inactive';
  last_communication?: string;
  main_power_connected: number;
  backup_battery_pct: number;
  gps_fixed: number;
  satellites: number;
  tamper_detected: number;
  registration_number?: string;
  supports_immobilisation: number;
}

export interface DashboardStats {
  totalVehicles: number;
  movingVehicles: number;
  stoppedVehicles: number;
  idleVehicles: number;
  onlineDevices: number;
  offlineDevices: number;
  todayPanicAlerts: number;
  overspeedingAlerts: number;
}
