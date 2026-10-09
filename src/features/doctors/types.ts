export interface DoctorRecord {
  id: string;
  doctor_name: string | null;
  specialty: string;
  facility_name: string;
  address: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  source_url?: string | null;
  verified_at?: string | null;
}

export interface SearchSpecialistsParams {
  specialty: string;
  city?: string;
  limit?: number;
}

export interface SearchSpecialistsResponse {
  results: DoctorRecord[];
}
