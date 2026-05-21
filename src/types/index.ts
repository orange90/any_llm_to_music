export interface Endpoint {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
}

export interface ClientEndpoint {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
}

export interface Track {
  id: string;
  title: string;
  prompt: string;
  code: string;
  endpoint_name: string;
  model: string;
  created_at: number;
}

export interface HistoryEntry {
  id: string;
  title: string;
  prompt: string;
  created_at: number;
  source: 'default' | 'user';
  results: EndpointGenerateResult[];
}

export interface GenerateRequest {
  prompt: string;
  endpoints?: ClientEndpoint[];
}

export interface EndpointGenerateResult {
  endpointId: string;
  endpointName: string;
  model: string;
  ok: boolean;
  pending?: boolean;
  code?: string;
  raw?: string;
  track?: Track;
  error?: string;
}

export interface GenerateResponse {
  source: 'default' | 'user';
  results: EndpointGenerateResult[];
  defaultQuota?: {
    limit: number;
    used: number;
    remaining: number;
  };
}

export interface TestEndpointRequest {
  baseURL: string;
  apiKey: string;
  model: string;
}

export interface TestEndpointResponse {
  ok: boolean;
  latencyMs?: number;
  message?: string;
  reply?: string;
}
