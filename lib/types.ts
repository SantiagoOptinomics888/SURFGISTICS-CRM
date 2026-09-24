// These types exactly mirror the API schemas at https://api.surfgistics.com/docs

export interface ArtsPart {
  id: number;
  created_at: string;
  importer_account: string | null;
  filer_code: string | null;
  part_number: string | null;
  description: string | null;
  country: string | null;
  unit_price: number | null;
  is_duty_exempt: boolean | null;
  is_mpfs_exempt: boolean | null;
  tariff_num: string | null;
  units_shipped: number | null;
  value: number | null;
  pga_agency: string | null;
  pga_disclaim_code: string | null;
  manufacturer: string | null;
  part_alias: string | null;
  warehouse: string | null;
  supplier_id: string | null;
}

export interface FtzLineItem {
  id: number;
  created_at: string;
  hbl: string | null;
  concurrence: boolean | null;
  importer_account: string | null;
  country_origin: string | null;
  part: string | null;
  tariff_number: string | null;
  piece_count: number | null;
  unit_price: number | null;
  line_value: number | null;
  weight_kg: number | null;
  hts_qty_1: number | null;
  hts_qty_2: number | null;
  line_charge: number | null;
  zone_status: string | null;
  lot_number: string | null;
  remarks: string | null;
  warehouse: string | null;
}

export interface Inbond {
  id: number;
  created_at: string;
  importer_account: string | null;
  container: string | null;
  manifest_uom: string | null;
  marks_numbers: string | null;
  part_number: string | null;
  tariff_number: string | null;
  description: string | null;
  piece_count: number | null;
  value: number | null;
  weight: number | null;
  weight_uom: string | null;
  warehouse: string | null;
}

export interface TallyOut {
  id: number;
  created_at: string;
  importer_account: string | null;
  delivery_order_no: string | null;
  item_code: string | null;
  quantity_ordered: number | null;
  price_per_unit: number | null;
  foreign_domestic_ind: string | null;
  doc_code_3461_7512: string | null;
  operator_id: string | null;
  internal_order_flag: boolean | null;
  warehouse: string | null;
}

export interface RecordCounts {
  parts: number;
  ftz_line_items: number;
  inbonds: number;
  tally_outs: number;
}

export interface VendorDetail {
  id: number;
  email: string;
  importer_account: string | null;
  firms_code: string | null;
  ftz_zone_id: string | null;
  default_port_code: string | null;
  use_ai_isf_extraction: boolean;
  use_ai_e214_extraction: boolean;
  is_active: boolean;
  role: string;
  record_counts: RecordCounts;
  last_updated: string | null;
}

export const MODULE_PERMISSIONS = ["imports", "parts", "tally_in", "inbond", "tally_out"] as const;
export type ModulePermission = (typeof MODULE_PERMISSIONS)[number];

export interface AdminUser {
  id: number;
  email: string;
  role: string;
  importer_account: string | null;
  firms_code: string | null;
  ftz_zone_id: string | null;
  default_port_code: string | null;
  use_ai_isf_extraction: boolean;
  use_ai_e214_extraction: boolean;
  is_active: boolean;
  permissions: string[];
  created_at: string;
}

export interface ManagerStats {
  total_vendors: number;
  total_parts: number;
  total_ftz_line_items: number;
  total_inbonds: number;
  total_tally_outs: number;
  total_records: number;
  pending_concurrences: number;
  last_updated: string | null;
}

export interface RecentActivityItem {
  type: string;
  description: string;
  vendor_email: string | null;
  importer_account: string | null;
  created_at: string;
}

export interface HblGroup {
  hbl: string;
  line_count: number;
  total_pieces: number;
  total_value: number;
  pending_count: number;
  line_items: FtzLineItem[];
}

export interface NewItemsResponse {
  parts: ArtsPart[];
  ftz_line_items: FtzLineItem[];
  inbonds: Inbond[];
  tally_outs: TallyOut[];
}

export type AcelynkResource =
  | "parts"
  | "ftz_line_item"
  | "inbond"
  | "tally_out"
  | "e214_entry_header"
  | "isf_acelynk"
  | "isf_gofreight";
export type AcelynkStatus = "pending" | "success" | "failed";

export interface AcelynkLogEntry {
  id: number;
  created_at: string;
  processed_at: string | null;
  resource_type: AcelynkResource;
  importer_account: string | null;
  identifier: string;
  query_fingerprint: string | null;
  status: AcelynkStatus;
  error_message: string | null;
  details: Record<string, unknown>;
  retried_count: number;
}

export interface ShipmentDocument {
  id: number;
  created_at: string;
  document_type: string;
  file_name: string;
  content_type: string;
  file_size: number;
  source: string;
  uploaded_by_email: string | null;
  extracted_data: Record<string, unknown>;
}

export interface ShipmentEvent {
  id: number;
  created_at: string;
  event_type: string;
  title: string;
  description: string | null;
  actor_email: string | null;
  details: Record<string, unknown>;
}

export interface ImportShipment {
  id: number;
  created_at: string;
  updated_at: string;
  hbl: string;
  importer_account: string | null;
  client_email: string | null;
  client_delivery_address: Record<string, string | null>;
  shipment_type: string | null;
  classification_source: string | null;
  status: string;
  created_by_email: string | null;
  isf_uploaded_at: string | null;
  isf_processed_at: string | null;
  document_request_due_at: string | null;
  document_request_sent_at: string | null;
  approved_at: string | null;
  approved_by_email: string | null;
  automation: Record<string, Record<string, unknown>>;
  documents: ShipmentDocument[];
  events: ShipmentEvent[];
}
