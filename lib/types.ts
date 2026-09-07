export type BuyingOption = "AUCTION" | "FIXED_PRICE";

export type Watch = {
  id: string;
  name: string;
  must_include: string[];
  must_exclude: string[];
  year: number | null;
  max_price: number | null;
  alert_below_pct: number;
  buying: BuyingOption[];
  enabled: boolean;
  last_median: number | null;
  last_comp_count: number | null;
  last_scanned_at: string | null;
  hit_count: number;
  created_at: string;
};

export type CompSample = {
  title: string;
  price: number;
  soldAt: string | null;
};

export type WatchComps = {
  watch_id: string;
  median: number | null;
  sale_count: number;
  samples: CompSample[];
  source_url: string;
  fetched_at: string;
};

export type Alert = {
  id: string;
  watch_id: string;
  watch_name: string;
  item_id: string;
  title: string;
  image_url: string | null;
  live_price: number;
  shipping: number;
  live_total: number;
  median: number | null;
  comp_count: number | null;
  pct_of_median: number | null;
  buying: "AUCTION" | "FIXED_PRICE";
  ends_at: string | null;
  ebay_url: string;
  point130_url: string;
  seller_feedback: number | null;
  seen: boolean;
  comp_status: "ok" | "unavailable";
  created_at: string;
};

export type WatchInput = {
  name: string;
  must_include: string[];
  must_exclude: string[];
  year: number | null;
  max_price: number | null;
  alert_below_pct: number;
  buying: BuyingOption[];
  enabled: boolean;
};
