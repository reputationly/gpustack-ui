import PageBox from '@/pages/_components/page-box';
import { useIntl } from '@umijs/max';
import { Button, Form, Input, InputNumber, message } from 'antd';
import React, { useEffect, useState } from 'react';
import { getStorageConfig, updateStorageConfig } from './apis';

const StorageSettings: React.FC = () => {
  const intl = useIntl();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

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
            data?.lightx2v_storage_low_watermark ?? 0.7
        });
      })
      .catch(() => {});
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
        lightx2v_storage_low_watermark: values.lightx2v_storage_low_watermark
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
