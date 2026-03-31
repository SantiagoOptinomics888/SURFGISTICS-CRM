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
  batch_reference_id: string | null;
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
