export interface ProviderRaw {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface ProviderResponse {
  results: ProviderRaw[];
}

export interface Provider {
  id: number;
  name: string;
  logoUrl: string;
}
