import type { ProviderId } from '@/types';

export interface GenerateOpts {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  apiKey: string;
  baseURL?: string;
}

export interface ListModelsOpts {
  apiKey?: string;
  baseURL?: string;
}

export interface ChatProvider {
  readonly id: ProviderId;
  readonly label: string;
  readonly defaultModels: string[];
  generate(opts: GenerateOpts): Promise<string>;
  listModels?(opts: ListModelsOpts): Promise<string[]>;
}
