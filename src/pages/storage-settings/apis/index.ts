import { request } from '@umijs/max';

// Server runtime config (whitelisted fields), served under the v2 base URL.
export const CONFIG_API = '/config';

export interface StorageConfig {
  lightx2v_output_root?: string | null;
  lightx2v_retention_days?: number | null;
  [key: string]: any;
}

export async function getStorageConfig() {
  return request<StorageConfig>(`${CONFIG_API}`, { method: 'GET' });
}

export async function updateStorageConfig(data: Partial<StorageConfig>) {
  return request<StorageConfig>(`${CONFIG_API}`, {
    method: 'PUT',
    data
  });
}
