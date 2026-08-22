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
  'qwen-image-edit': 40,
  'qwen-image': 17
};

// 秒数取值区间。两张按模型表和五个按类别阈值共用,避免“按模型能填 86400、
// 它要覆盖的按类别阈值却封顶 3600”这种自相矛盾的上限。
// 上界取 24h:H3 标准档一条 ~660s,容忍排几轮就是小时级,3600 顶不住。
const SECONDS_MIN = 1;
const SECONDS_MAX = 86400;

// seconds 允许为 null —— InputNumber 清空时给的就是 null,存 null 才能让用户
// 正常地“清掉再重填”。落库前在 rowsToObject 里夹紧,null 不会流到后端。
type ModelRow = { model: string; seconds: number | null };

const clampSeconds = (v: unknown): number => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return SECONDS_MIN;
  return Math.min(SECONDS_MAX, Math.max(SECONDS_MIN, n));
};

// 把按模型的秒数表(对象或 JSON 字符串)解析成可编辑的行。
// fallback 只在“字段整个缺失/不可解析”时使用;显式的空对象 {} 保持为空表,
// 否则用户删光所有行再保存,回到本页又会看到兜底值复活。
const parseModelRows = (
  raw: Record<string, number> | string | null | undefined,
  fallback: Record<string, number> = {}
): ModelRow[] => {
  let obj: any = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = null;
    }
  }
  if (!obj || typeof obj !== 'object') {
    obj = fallback;
  }
  return Object.entries(obj as Record<string, unknown>).map(([model, v]) => {
    const n = Number(v);
    // 历史脏数据里的 0 / 非数值不静默改写成 1,而是留空并在 UI 上标红,
    // 逼用户看见并确认 —— 排队上限填 0 的语义是“一有排队就拒”,不能悄悄改。
    return {
      model,
      seconds: Number.isFinite(n) && n > 0 ? n : null
    };
  });
};

// 行数组 → 提交用对象。丢掉空模型名,秒数夹紧到 [SECONDS_MIN, SECONDS_MAX];
// /config 会按 dict 字段做类型转换。JS 对象与 Python dict 都保序,
// 所以这里的 key 顺序就是后端 _lookup_by_model() 的匹配优先级。
const rowsToObject = (rows: ModelRow[]): Record<string, number> => {
  const out: Record<string, number> = {};
  rows.forEach((r) => {
    const m = (r.model || '').trim();
    if (m) out[m] = clampSeconds(r.seconds);
  });
  return out;
};

// 两张按模型表的公共编辑器。后端 _lookup_by_model() 是“子串匹配 + 取第一个命中”,
// 命中顺序 = 这里的行序,所以更长/更具体的 key 必须排在前面
// (例:qwen-image-edit 要在 qwen-image 之上,否则永远命中不到)。
const ModelSecondsTable: React.FC<{
  rows: ModelRow[];
  onChange: (rows: ModelRow[]) => void;
  defaultSeconds: number;
}> = ({ rows, onChange, defaultSeconds }) => {
  const intl = useIntl();
  const updateRow = (idx: number, patch: Partial<ModelRow>) =>
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeRow = (idx: number) => onChange(rows.filter((_, i) => i !== idx));
  const moveRow = (idx: number, delta: number) => {
    const to = idx + delta;
    if (to < 0 || to >= rows.length) return;
    const next = [...rows];
    [next[idx], next[to]] = [next[to], next[idx]];
    onChange(next);
  };
  const addRow = () =>
    onChange([...rows, { model: '', seconds: defaultSeconds }]);

  // 重名行会被 rowsToObject 静默合并成后写的那条,而在“行序即优先级”的心智下
  // 用户多半以为生效的是上面那行 —— 标红让冲突可见。
  const trimmed = rows.map((r) => (r.model || '').trim());
  const duplicated = new Set(
    trimmed.filter((m, i) => m && trimmed.indexOf(m) !== i)
  );

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {rows.map((row, idx) => (
        <Space key={idx} align="baseline">
          <Input
            style={{ width: 260 }}
            status={duplicated.has(trimmed[idx]) ? 'error' : undefined}
            placeholder={intl.formatMessage({
              id: 'storageSettings.admission.modelName'
            })}
            value={row.model}
            onChange={(e) => updateRow(idx, { model: e.target.value })}
          />
          <InputNumber
            style={{ width: 120 }}
            min={SECONDS_MIN}
            max={SECONDS_MAX}
            status={row.seconds == null ? 'error' : undefined}
            placeholder={intl.formatMessage({
              id: 'storageSettings.admission.seconds'
            })}
            value={row.seconds}
            onChange={(v) =>
              updateRow(idx, { seconds: typeof v === 'number' ? v : null })
            }
          />
          <Typography.Text type="secondary">s</Typography.Text>
          <Button
            type="link"
            disabled={idx === 0}
            onClick={() => moveRow(idx, -1)}
            title={intl.formatMessage({
              id: 'storageSettings.admission.moveUp'
            })}
          >
            ↑
          </Button>
          <Button
            type="link"
            disabled={idx === rows.length - 1}
            onClick={() => moveRow(idx, 1)}
            title={intl.formatMessage({
              id: 'storageSettings.admission.moveDown'
            })}
          >
            ↓
          </Button>
          <Button type="link" danger onClick={() => removeRow(idx)}>
            {intl.formatMessage({ id: 'common.button.delete' })}
          </Button>
        </Space>
      ))}
      <Button type="dashed" onClick={addRow} style={{ width: 260 }}>
        {intl.formatMessage({ id: 'storageSettings.admission.addModel' })}
      </Button>
    </Space>
  );
};

const StorageSettings: React.FC = () => {
  const intl = useIntl();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  // 首次加载失败 → 禁用保存(否则空表会覆盖线上配置,见 useEffect 的 catch)。
  const [loadFailed, setLoadFailed] = useState(false);
  // 两张按模型表都用受控 state(动态增删行 + 行序即匹配优先级),保存时再拼回对象。
  const [latencyRows, setLatencyRows] = useState<ModelRow[]>([]);
  const [queueWaitRows, setQueueWaitRows] = useState<ModelRow[]>([]);

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
            data?.lightx2v_audio_max_queue_wait_seconds ?? 60,
          lightx2v_music_max_queue_wait_seconds:
            data?.lightx2v_music_max_queue_wait_seconds ?? 90,
          lightx2v_audiogen_max_queue_wait_seconds:
            data?.lightx2v_audiogen_max_queue_wait_seconds ?? 90
        });
        setLatencyRows(
          parseModelRows(data?.lightx2v_model_latency_seconds, DEFAULT_LATENCY)
        );
        // 按模型排队上限没有兜底表:留空即表示“全部按类别阈值”,不要凭空造行。
        setQueueWaitRows(
          parseModelRows(data?.lightx2v_model_queue_wait_seconds)
        );
      })
      .catch(() => {
        // 读不到当前配置就必须禁掉保存:此时两张表还是空的,一旦提交就会把线上
        // 的按模型表整个覆盖成 {},而 {} 是“显式清空”语义(见 parseModelRows),
        // 重新加载也救不回来。
        setLoadFailed(true);
      });
  }, []);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
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
        lightx2v_music_max_queue_wait_seconds:
          values.lightx2v_music_max_queue_wait_seconds,
        lightx2v_audiogen_max_queue_wait_seconds:
          values.lightx2v_audiogen_max_queue_wait_seconds,
        lightx2v_model_latency_seconds: rowsToObject(latencyRows),
        lightx2v_model_queue_wait_seconds: rowsToObject(queueWaitRows)
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
            <InputNumber
              min={SECONDS_MIN}
              max={SECONDS_MAX}
              style={{ width: 200 }}
            />
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
            <InputNumber
              min={SECONDS_MIN}
              max={SECONDS_MAX}
              style={{ width: 200 }}
            />
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
            <InputNumber
              min={SECONDS_MIN}
              max={SECONDS_MAX}
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item
            name="lightx2v_music_max_queue_wait_seconds"
            label={intl.formatMessage({
              id: 'storageSettings.admission.musicWait'
            })}
            extra={intl.formatMessage({
              id: 'storageSettings.admission.musicWait.tips'
            })}
          >
            <InputNumber
              min={SECONDS_MIN}
              max={SECONDS_MAX}
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item
            name="lightx2v_audiogen_max_queue_wait_seconds"
            label={intl.formatMessage({
              id: 'storageSettings.admission.audiogenWait'
            })}
            extra={intl.formatMessage({
              id: 'storageSettings.admission.audiogenWait.tips'
            })}
          >
            <InputNumber
              min={SECONDS_MIN}
              max={SECONDS_MAX}
              style={{ width: 200 }}
            />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({
              id: 'storageSettings.admission.latencyTable'
            })}
            extra={intl.formatMessage({
              id: 'storageSettings.admission.latencyTable.tips'
            })}
          >
            <ModelSecondsTable
              rows={latencyRows}
              onChange={setLatencyRows}
              defaultSeconds={30}
            />
          </Form.Item>

          <Form.Item
            label={intl.formatMessage({
              id: 'storageSettings.admission.queueWaitTable'
            })}
            extra={intl.formatMessage({
              id: 'storageSettings.admission.queueWaitTable.tips'
            })}
          >
            <ModelSecondsTable
              rows={queueWaitRows}
              onChange={setQueueWaitRows}
              defaultSeconds={150}
            />
          </Form.Item>

          <Form.Item
            extra={
              loadFailed
                ? intl.formatMessage({
                    id: 'storageSettings.loadFailed.tips'
                  })
                : undefined
            }
          >
            <Button
              type="primary"
              loading={loading}
              disabled={loadFailed}
              onClick={handleSave}
            >
              {intl.formatMessage({ id: 'common.button.save' })}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </PageBox>
  );
};

export default StorageSettings;
