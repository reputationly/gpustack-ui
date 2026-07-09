import PageBox from '@/pages/_components/page-box';
import { useIntl } from '@umijs/max';
import {
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  Space,
  Switch,
  Typography,
  message
} from 'antd';
import React, { useEffect, useState } from 'react';
import { getStorageConfig, updateStorageConfig } from './apis';

// 按模型单实例热态延迟(秒)默认值 —— 取自 LightX2V 实测报告。管理端未配置时的展示兜底。
// 注:qwen-image-edit 单图实测 ~22s,多图(i2i ≤5 张)更慢,这里按多图取 ~40s 估值;
// 建议真机压一版多图后按实测调整(此表仅驱动准入的排队预估,可在本页热更)。
const DEFAULT_LATENCY: Record<string, number> = {
  'z-image': 8,
  'qwen-image': 17,
  'qwen-image-edit': 40,
  'wan2.2-i2v': 90,
  'wan2.2-flf2v': 90
};

type LatencyRow = { model: string; seconds: number };

// 把 lightx2v_model_latency_seconds(对象或 JSON 字符串)解析成可编辑的行;缺省用兜底表。
const parseLatencyRows = (
  raw: Record<string, number> | string | null | undefined
): LatencyRow[] => {
  let obj: any = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = null;
    }
  }
  if (!obj || typeof obj !== 'object') {
    obj = DEFAULT_LATENCY;
  }
  return Object.entries(obj as Record<string, unknown>).map(([model, v]) => ({
    model,
    seconds: Number(v) || 0
  }));
};

const StorageSettings: React.FC = () => {
  const intl = useIntl();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  // 模型延迟表用受控 state(动态增删行),保存时再拼回对象。
  const [latencyRows, setLatencyRows] = useState<LatencyRow[]>([]);

  // Load current config on entry (lifecycle entry point, not effect-driven sync).
  useEffect(() => {
    getStorageConfig()
      .then((data) => {
        form.setFieldsValue({
          lightx2v_output_root: data?.lightx2v_output_root ?? '',
          lightx2v_retention_days: data?.lightx2v_retention_days ?? 7,
          lightx2v_storage_high_watermark:
            data?.lightx2v_storage_high_watermark ?? 0.85,
          lightx2v_storage_low_watermark:
            data?.lightx2v_storage_low_watermark ?? 0.7,
          lightx2v_admission_enabled: data?.lightx2v_admission_enabled ?? true,
          lightx2v_image_max_queue_wait_seconds:
            data?.lightx2v_image_max_queue_wait_seconds ?? 25,
          lightx2v_video_max_queue_wait_seconds:
            data?.lightx2v_video_max_queue_wait_seconds ?? 150,
          lightx2v_audio_max_queue_wait_seconds:
            data?.lightx2v_audio_max_queue_wait_seconds ?? 60
        });
        setLatencyRows(parseLatencyRows(data?.lightx2v_model_latency_seconds));
      })
      .catch(() => {});
  }, []);

  const updateRow = (idx: number, patch: Partial<LatencyRow>) => {
    setLatencyRows((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  };
  const removeRow = (idx: number) => {
    setLatencyRows((rows) => rows.filter((_, i) => i !== idx));
  };
  const addRow = () => {
    setLatencyRows((rows) => [...rows, { model: '', seconds: 30 }]);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      // 拼回按模型延迟对象(丢空模型名);/config 会按 dict 字段做类型转换。
      const latency: Record<string, number> = {};
      latencyRows.forEach((r) => {
        const m = (r.model || '').trim();
        if (m) latency[m] = Number(r.seconds) || 0;
      });
      await updateStorageConfig({
        // Send '' (not null) when blank: the /config setter coerces optional
        // string fields via str(v), so null would persist the literal "None"
        // and break the output-root fallback (env → /nfs-output). '' stays
        // falsy and falls back correctly.
        lightx2v_output_root: values.lightx2v_output_root || '',
        lightx2v_retention_days: values.lightx2v_retention_days,
        lightx2v_storage_high_watermark: values.lightx2v_storage_high_watermark,
        lightx2v_storage_low_watermark: values.lightx2v_storage_low_watermark,
        lightx2v_admission_enabled: values.lightx2v_admission_enabled,
        lightx2v_image_max_queue_wait_seconds:
          values.lightx2v_image_max_queue_wait_seconds,
        lightx2v_video_max_queue_wait_seconds:
          values.lightx2v_video_max_queue_wait_seconds,
        lightx2v_audio_max_queue_wait_seconds:
          values.lightx2v_audio_max_queue_wait_seconds,
        lightx2v_model_latency_seconds: latency
      });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
    } catch (error) {
      // validation / request errors surface via the form / global handler
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageBox>
      <div style={{ maxWidth: 640, padding: '24px 0' }}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="lightx2v_output_root"
            label={intl.formatMessage({ id: 'storageSettings.outputRoot' })}
            extra={intl.formatMessage({
              id: 'storageSettings.outputRoot.tips'
            })}
          >
            <Input placeholder="/nfs-output" allowClear />
          </Form.Item>
          <Form.Item
            name="lightx2v_retention_days"
            label={intl.formatMessage({ id: 'storageSettings.retentionDays' })}
            extra={intl.formatMessage({
              id: 'storageSettings.retentionDays.tips'
            })}
          >
            <InputNumber min={1} max={365} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item
            name="lightx2v_storage_high_watermark"
            label={intl.formatMessage({ id: 'storageSettings.highWatermark' })}
            extra={intl.formatMessage({ id: 'storageSettings.watermark.tips' })}
          >
            <InputNumber min={0} max={1} step={0.05} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item
            name="lightx2v_storage_low_watermark"
            label={intl.formatMessage({ id: 'storageSettings.lowWatermark' })}
          >
            <InputNumber min={0} max={1} step={0.05} style={{ width: 200 }} />
          </Form.Item>

          <Divider orientation="left">
            {intl.formatMessage({ id: 'storageSettings.admission.section' })}
          </Divider>

          <Form.Item
            name="lightx2v_admission_enabled"
            label={intl.formatMessage({
              id: 'storageSettings.admission.enabled'
            })}
            valuePropName="checked"
            extra={intl.formatMessage({
              id: 'storageSettings.admission.enabled.tips'
            })}
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="lightx2v_image_max_queue_wait_seconds"
            label={intl.formatMessage({
              id: 'storageSettings.admission.imageWait'
            })}
            extra={intl.formatMessage({
              id: 'storageSettings.admission.imageWait.tips'
            })}
          >
            <InputNumber min={1} max={3600} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item
            name="lightx2v_video_max_queue_wait_seconds"
            label={intl.formatMessage({
              id: 'storageSettings.admission.videoWait'
            })}
            extra={intl.formatMessage({
              id: 'storageSettings.admission.videoWait.tips'
            })}
          >
            <InputNumber min={1} max={3600} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item
            name="lightx2v_audio_max_queue_wait_seconds"
            label={intl.formatMessage({
              id: 'storageSettings.admission.audioWait'
            })}
            extra={intl.formatMessage({
              id: 'storageSettings.admission.audioWait.tips'
            })}
          >
            <InputNumber min={1} max={3600} style={{ width: 200 }} />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({
              id: 'storageSettings.admission.latencyTable'
            })}
            extra={intl.formatMessage({
              id: 'storageSettings.admission.latencyTable.tips'
            })}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {latencyRows.map((row, idx) => (
                <Space key={idx} align="baseline">
                  <Input
                    style={{ width: 260 }}
                    placeholder={intl.formatMessage({
                      id: 'storageSettings.admission.modelName'
                    })}
                    value={row.model}
                    onChange={(e) => updateRow(idx, { model: e.target.value })}
                  />
                  <InputNumber
                    style={{ width: 120 }}
                    min={1}
                    max={3600}
                    placeholder={intl.formatMessage({
                      id: 'storageSettings.admission.seconds'
                    })}
                    value={row.seconds}
                    onChange={(v) =>
                      updateRow(idx, { seconds: Number(v) || 0 })
                    }
                  />
                  <Typography.Text type="secondary">s</Typography.Text>
                  <Button type="link" danger onClick={() => removeRow(idx)}>
                    {intl.formatMessage({ id: 'common.button.delete' })}
                  </Button>
                </Space>
              ))}
              <Button type="dashed" onClick={addRow} style={{ width: 260 }}>
                {intl.formatMessage({
                  id: 'storageSettings.admission.addModel'
                })}
              </Button>
            </Space>
          </Form.Item>

          <Form.Item>
            <Button type="primary" loading={loading} onClick={handleSave}>
              {intl.formatMessage({ id: 'common.button.save' })}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </PageBox>
  );
};

export default StorageSettings;
