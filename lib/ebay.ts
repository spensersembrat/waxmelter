type EbayToken = {
  access_token: string;
  expires_at: number;
};

let cachedToken: EbayToken | null = null;

const CATEGORY_SINGLES = "261328";

export type EbayListing = {
  itemId: string;
  title: string;
  price: number;
  shipping: number;
  buying: "AUCTION" | "FIXED_PRICE";
  hasAuction: boolean;
  endsAt: string | null;
  imageUrl: string | null;
  url: string;
  sellerFeedback: number | null;
};

function basicAuth(): string {
  const id = process.env.EBAY_CLIENT_ID;
  const secret = process.env.EBAY_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("eBay is not configured. Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET.");
  }
  return Buffer.from(`${id}:${secret}`).toString("base64");
}

export function hasOfficialEbay(): boolean {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}

export function hasEbay(): boolean {
  return hasOfficialEbay();
}

async function getAppToken(): Promise<string> {
  if (cachedToken && cachedToken.expires_at > Date.now() + 60_000) {
    return cachedToken.access_token;
  }

  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`eBay OAuth failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    access_token: json.access_token,
    expires_at: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.access_token;
}

function parseBuying(options: string[] | undefined): "AUCTION" | "FIXED_PRICE" {
  if (options?.includes("AUCTION") && !options.includes("FIXED_PRICE")) return "AUCTION";
  return "FIXED_PRICE";
}

export async function searchOfficialEbayListings(options: {
  query: string;
  maxPrice?: number | null;
}): Promise<EbayListing[]> {
  const token = await getAppToken();
  const filters = [`buyingOptions:{FIXED_PRICE}`, "priceCurrency:USD"];
  if (options.maxPrice && options.maxPrice > 0) {
    filters.splice(1, 0, `price:[0..${options.maxPrice}]`);
  }

  const params = new URLSearchParams({
    q: options.query,
    category_ids: CATEGORY_SINGLES,
    limit: "50",
    filter: filters.join(","),
    sort: "newlyListed",
  });

  const response = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`eBay search failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as {
    itemSummaries?: Array<{
      itemId: string;
      title: string;
      price?: { value: string };
      shippingOptions?: Array<{ shippingCost?: { value: string } }>;
      buyingOptions?: string[];
      itemEndDate?: string;
      image?: { imageUrl?: string };
      thumbnailImages?: Array<{ imageUrl?: string }>;
      itemWebUrl?: string;
      seller?: { feedbackScore?: number };
    }>;
  };

  return (json.itemSummaries ?? []).map((item) => {
    const price = Number(item.price?.value ?? 0);
    const shipping = Number(item.shippingOptions?.[0]?.shippingCost?.value ?? 0);
    return {
      itemId: item.itemId,
      title: item.title,
      price,
      shipping: Number.isFinite(shipping) ? shipping : 0,
      buying: parseBuying(item.buyingOptions),
      hasAuction: Boolean(item.buyingOptions?.includes("AUCTION")),
      endsAt: item.itemEndDate ?? null,
      imageUrl: item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl ?? null,
      url: item.itemWebUrl ?? `https://www.ebay.com/itm/${item.itemId}`,
      sellerFeedback: item.seller?.feedbackScore ?? null,
    };
  });
}
