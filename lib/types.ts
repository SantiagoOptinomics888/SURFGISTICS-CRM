export interface ArtsPart {
  id: number;
  importer_account: string;
  part_number: string;
  description: string | null;
  tariff_number: string | null;
  unit_price: number | null;
  duty_exempt: boolean;
  supplier: string | null;
  created_at: string;
}

export interface FtzLineItem {
  id: number;
  batch_reference_id: string;
  importer_account: string;
  part_number: string;
  description: string | null;
  quantity: number;
  unit_value: number | null;
  concurrence: boolean;
  created_at: string;
}

export interface Inbond {
  id: number;
  importer_account: string;
  container_number: string | null;
  manifest_number: string | null;
  part_number: string | null;
  quantity: number | null;
  created_at: string;
}

export interface TallyOut {
  id: number;
  importer_account: string;
  delivery_order_no: string | null;
  part_number: string | null;
  quantity: number | null;
  created_at: string;
}

export interface RecordCounts {
  arts_parts: number;
  ftz_line_items: number;
  inbonds: number;
  tally_outs: number;
}

export interface VendorDetail {
  id: number;
  email: string;
  importer_account: string | null;
  is_active: boolean;
  role: string;
  record_counts: RecordCounts;
}

export interface ManagerStats {
  total_vendors: number;
  total_arts_parts: number;
  total_ftz_line_items: number;
  total_inbonds: number;
  total_tally_outs: number;
}
