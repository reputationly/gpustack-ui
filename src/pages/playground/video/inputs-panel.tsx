import { InboxOutlined, UploadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, InputNumber, Upload } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import React, { useEffect, useMemo, useState } from 'react';
import {
  VideoInputField,
  VideoTaskType,
  taskHasSrRatio,
  videoTaskInputs
} from './task-inputs';

// Max files a multi-value field (src_ref_images) accepts — mirrors the facade
// _MAX_INPUT_IMAGES so the UI blocks over-count before hitting the server.
const MAX_MULTI = 5;

export interface VideoInputsValue {
  files: Record<string, File[]>;
  srRatio?: number;
}

interface InputsPanelProps {
  taskType: VideoTaskType;
  disabled?: boolean;
  onChange: (value: VideoInputsValue) => void;
}

// Conditional upload controls for the video playground: renders exactly the
// inputs a task_type needs (i2v→image, s2v→image+audio, sr→video+sr_ratio,
// vace→src_video/src_mask/src_ref_images). Files are held as antd UploadFile
// (originFileObj is the raw File) so the submit step can stream them via
// multipart to POST /v1/videos/inputs — never base64 in the JSON body.
const InputsPanel: React.FC<InputsPanelProps> = ({
  taskType,
  disabled,
  onChange
}) => {
  const intl = useIntl();
  const fields = useMemo(() => videoTaskInputs[taskType] || [], [taskType]);
  const [fileMap, setFileMap] = useState<Record<string, UploadFile[]>>({});
  const [srRatio, setSrRatio] = useState<number>(2);

  // Reset all selections when the task type changes (switching models must not
  // carry a previous model's image into an sr request, etc.). Also push the
  // cleared value up to the parent — otherwise inputsValue keeps the previous
  // task's files and generateParams() would submit them under the new task type.
  useEffect(() => {
    setFileMap({});
    setSrRatio(2);
    onChange({
      files: {},
      srRatio: taskHasSrRatio(taskType) ? 2 : undefined
    });
    // onChange is a stable setState from the parent; reset only on task change.
  }, [taskType]);

  const emit = (nextMap: Record<string, UploadFile[]>, nextSrRatio: number) => {
    const files: Record<string, File[]> = {};
    Object.keys(nextMap).forEach((field) => {
      const list = (nextMap[field] || [])
        .map((f) => f.originFileObj as File)
        .filter(Boolean);
      if (list.length) {
        files[field] = list;
      }
    });
    onChange({
      files,
      srRatio: taskHasSrRatio(taskType) ? nextSrRatio : undefined
    });
  };

  const handleFilesChange = (field: string, list: UploadFile[]) => {
    const nextMap = { ...fileMap, [field]: list };
    setFileMap(nextMap);
    emit(nextMap, srRatio);
  };

  const handleSrRatioChange = (val: number | null) => {
    const next = val ?? 2;
    setSrRatio(next);
    emit(fileMap, next);
  };

  const renderUpload = (cfg: VideoInputField) => {
    const list = fileMap[cfg.field] || [];
    const maxCount = cfg.multiple ? MAX_MULTI : 1;
    const label = intl.formatMessage({ id: cfg.labelId });
    return (
      <div key={cfg.field} style={{ marginBottom: 16 }}>
        <div
          style={{
            marginBottom: 6,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          {label}
          {cfg.required && (
            <span style={{ color: 'var(--ant-color-error)' }}>*</span>
          )}
        </div>
        <Upload
          accept={cfg.accept}
          multiple={cfg.multiple}
          maxCount={maxCount}
          disabled={disabled}
          fileList={list}
          // Keep the file client-side (no auto-upload); the submit step streams
          // it via multipart. Returning false stores it with originFileObj set.
          beforeUpload={() => false}
          onChange={({ fileList }) =>
            handleFilesChange(cfg.field, fileList.slice(-maxCount))
          }
          listType={cfg.kind === 'image' ? 'picture-card' : 'text'}
        >
          {list.length < maxCount &&
            (cfg.kind === 'image' ? (
              <div>
                <InboxOutlined />
                <div style={{ marginTop: 4, fontSize: 12 }}>{label}</div>
              </div>
            ) : (
              <Button
                size="small"
                icon={<UploadOutlined />}
                disabled={disabled}
              >
                {label}
              </Button>
            ))}
        </Upload>
      </div>
    );
  };

  if (!fields.length && !taskHasSrRatio(taskType)) {
    return null;
  }

  return (
    <div className="video-inputs-panel" style={{ marginBottom: 8 }}>
      {fields.map(renderUpload)}
      {taskHasSrRatio(taskType) && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 6, fontSize: 13 }}>
            {intl.formatMessage({ id: 'playground.video.input.srRatio' })}
          </div>
          <InputNumber
            min={1}
            max={4}
            step={0.25}
            value={srRatio}
            disabled={disabled}
            onChange={handleSrRatioChange}
            style={{ width: 120 }}
          />
        </div>
      )}
    </div>
  );
};

export default InputsPanel;
