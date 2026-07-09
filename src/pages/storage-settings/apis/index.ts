import { request } from '@umijs/max';

// Server runtime config (whitelisted fields), served under the v2 base URL.
export const CONFIG_API = '/config';

export interface StorageConfig {
  lightx2v_output_root?: string | null;
  lightx2v_retention_days?: number | null;
  lightx2v_storage_high_watermark?: number | null;
  lightx2v_storage_low_watermark?: number | null;
  // 队列 / 反压(admission control)——门面按模型预估排队等待,超阈值 429。
  lightx2v_admission_enabled?: boolean | null;
  lightx2v_image_max_queue_wait_seconds?: number | null;
  lightx2v_video_max_queue_wait_seconds?: number | null;
  lightx2v_audio_max_queue_wait_seconds?: number | null;
  // 按模型单实例热态延迟(秒),对象形态或 JSON 字符串。
  lightx2v_model_latency_seconds?: Record<string, number> | string | null;
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
