import VideoPoster from '@/assets/images/video-poster.png';
import { setRouteCache } from '@/atoms/route-cache';
import routeCachekey from '@/config/route-cachekey';
import { VideoCameraOutlined } from '@ant-design/icons';
import { AlertInfo, IconFont } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Button, Spin, Tooltip } from 'antd';
import _ from 'lodash';
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react';
import { CREATE_VIDEO_API } from '../apis';
import MessageInput from '../components/message-input';
import RightContainer from '../components/right-container';
import ViewCommonCode from '../components/view-common-code';
import { videoPromptList } from '../config';
import { useInitVideoMeta } from '../hooks/use-init-video-meta';
import useTextVideo from '../hooks/use-text-video';
import '../style/ground-llm.less';
import '../style/system-message-wrap.less';
import { generateCode } from '../view-code/video';
import DataForm from './forms';
import InputsPanel, { VideoInputsValue } from './inputs-panel';
import {
  inferVideoTaskType,
  taskHasSrRatio,
  videoTaskInputs
} from './task-inputs';

interface MessageProps {
  modelList: Global.BaseOption<string>[];
  loaded?: boolean;
  ref?: any;
}

const GroundVideo: React.FC<MessageProps> = forwardRef((props, ref) => {
  const { modelList } = props;

  const intl = useIntl();
  const [show, setShow] = useState(false);
  const [collapse, setCollapse] = useState(false);
  const scroller = useRef<any>(null);
  const inputRef = useRef<any>(null);

  const {
    handleOnValuesChange,
    handleToggleParamsStyle,
    setParams,
    form,
    paramsConfig,
    initialValues,
    parameters,
    isOpenaiCompatible
  } = useInitVideoMeta(props, {
    type: 'create'
  });
  const {
    loading,
    tokenResult,
    videoList,
    currentPrompt,
    setCurrentPrompt,
    setTokenResult,
    handleClear,
    handleStopConversation,
    submitMessage
  } = useTextVideo({
    scroller,
    API: CREATE_VIDEO_API
  });

  // Uploaded inputs (files per facade field + optional sr_ratio), driven by the
  // selected model's task_type. Empty for plain text-to-video.
  const [inputsValue, setInputsValue] = useState<VideoInputsValue>({
    files: {}
  });

  // task_type decides which inputs the model needs. Prefer an explicit
  // meta.task_type; otherwise infer from the model name (same rule as backend).
  const currentModelMeta = modelList.find(
    (m: any) => m.value === parameters.model
  )?.meta;
  const taskType = inferVideoTaskType(parameters.model, currentModelMeta);

  useImperativeHandle(ref, () => {
    return {
      viewCode() {
        setShow(true);
      },
      setCollapse() {
        setCollapse(!collapse);
      },
      collapse: collapse
    };
  });

  const generateNumber = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
  };

  const handleRandomPrompt = useCallback(() => {
    const randomIndex = generateNumber(0, videoPromptList.length - 1);
    const randomPrompt = videoPromptList[randomIndex];
    inputRef.current?.handleInputChange({
      target: {
        value: randomPrompt
      }
    });
  }, []);

  const finalParameters = useMemo(() => {
    if (parameters.size === 'custom') {
      return {
        ..._.omit(parameters, ['width', 'height']),
        size:
          parameters.width && parameters.height
            ? `${parameters.width}x${parameters.height}`
            : ''
      };
    }
    return {
      ..._.omit(parameters, ['width', 'height'])
    };
  }, [parameters]);

  const viewCodeContent = useMemo(() => {
    return generateCode({
      api: CREATE_VIDEO_API,
      isFormdata: false,
      parameters: {
        ...finalParameters,
        prompt: currentPrompt
      }
    });
  }, [finalParameters, isOpenaiCompatible, currentPrompt]);

  const handleInputChange = (e: any) => {
    setCurrentPrompt(e.target.value);
  };

  const generateParams = () => {
    const params: any = {
      ..._.omitBy(finalParameters, (value: string) => !value),
      prompt: currentPrompt,
      task_type: taskType,
      // Consumed by the submit hook (uploaded to NFS, then stripped): the raw
      // files per facade field and the resolved task_type for the upload path.
      __taskType: taskType,
      __inputs: inputsValue.files
    };
    if (taskHasSrRatio(taskType) && inputsValue.srRatio) {
      params.sr_ratio = inputsValue.srRatio;
    }
    return params;
  };

  // Client-side input guard (the facade re-validates authoritatively): required
  // fields must be present; vace needs a source video or reference image.
  const missingInputMessage = (): string => {
    const files = inputsValue.files || {};
    const required = (videoTaskInputs[taskType] || []).filter(
      (f) => f.required
    );
    for (const f of required) {
      if (!(files[f.field] || []).length) {
        return intl.formatMessage(
          { id: 'playground.video.input.required' },
          { field: intl.formatMessage({ id: f.labelId }) }
        );
      }
    }
    if (
      taskType === 'vace' &&
      !(files.src_video || []).length &&
      !(files.src_ref_images || []).length
    ) {
      return intl.formatMessage({ id: 'playground.video.input.vaceRequired' });
    }
    // Mirror the facade's "src_mask requires src_video" cross-field constraint so
    // a mask-without-source-video upload isn't started only to be rejected.
    if (
      taskType === 'vace' &&
      (files.src_mask || []).length &&
      !(files.src_video || []).length
    ) {
      return intl.formatMessage({
        id: 'playground.video.input.maskNeedsVideo'
      });
    }
    return '';
  };

  const handleSendMessage = async () => {
    try {
      await form.current?.form?.validateFields();
      if (!parameters.model) return;
      const missing = missingInputMessage();
      if (missing) {
        setTokenResult({ error: true, errorMessage: missing });
        return;
      }
      const params = generateParams();
      setParams({
        ...parameters
      });

      setRouteCache(routeCachekey['/playground/video'], true);
      await submitMessage(params);
    } catch (error) {
      // console.log('error:', error);
    } finally {
      setRouteCache(routeCachekey['/playground/video'], false);
    }
  };

  const handleCloseViewCode = useCallback(() => {
    setShow(false);
  }, []);

  return (
    <div className="ground-left-wrapper">
      <div className="ground-left">
        <div
          className="message-list-wrap"
          ref={scroller}
          style={{ paddingBottom: 16 }}
        >
          <>
            <div className="content" style={{ height: '100%' }}>
              {videoList.length > 0 && (
                <div
                  style={{
                    width: '100%',
                    maxWidth: 720,
                    margin: '24px auto',
                    aspectRatio: '16 / 9',
                    background: '#000',
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)'
                  }}
                >
                  <Spin
                    spinning={loading}
                    size="middle"
                    styles={{
                      root: {
                        height: '100%'
                      },
                      container: {
                        height: '100%'
                      }
                    }}
                  >
                    <video
                      src={videoList[0]?.dataUrl}
                      poster={VideoPoster}
                      controls
                      disablePictureInPicture
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  </Spin>
                </div>
              )}
              {!videoList.length && (
                <div className="flex-column font-size-14 flex-center gap-20 justify-center hold-wrapper">
                  <VideoCameraOutlined className="font-size-32 text-secondary" />
                  <span>
                    {intl.formatMessage({
                      id: 'playground.video.empty.tips'
                    })}
                  </span>
                </div>
              )}
            </div>
          </>
        </div>
        {tokenResult && (
          <div style={{ height: 40 }}>
            <AlertInfo
              type="danger"
              message={tokenResult?.errorMessage}
            ></AlertInfo>
          </div>
        )}
        <div className="ground-left-footer">
          <MessageInput
            ref={inputRef}
            placeholer={intl.formatMessage({
              id: 'playground.input.prompt.holder'
            })}
            actions={[]}
            defaultSize={{
              minRows: 5,
              maxRows: 5
            }}
            title={intl.formatMessage({ id: 'playground.image.prompt' })}
            loading={loading}
            disabled={!parameters.model}
            isEmpty={!videoList.length}
            handleSubmit={handleSendMessage}
            handleAbortFetch={handleStopConversation}
            onInputChange={handleInputChange}
            shouldResetMessage={false}
            clearAll={handleClear}
            tools={
              <>
                <Tooltip
                  title={intl.formatMessage({
                    id: 'playground.image.prompt.random'
                  })}
                >
                  <Button
                    onClick={handleRandomPrompt}
                    size="middle"
                    type="text"
                    icon={<IconFont type="icon-random"></IconFont>}
                  ></Button>
                </Tooltip>
              </>
            }
          />
        </div>
      </div>
      <RightContainer collapsed={collapse}>
        <DataForm
          ref={form}
          onValuesChange={handleOnValuesChange}
          paramsConfig={paramsConfig}
          initialValues={initialValues}
          modelList={modelList}
        />
        <InputsPanel
          taskType={taskType}
          disabled={loading}
          onChange={setInputsValue}
        />
      </RightContainer>
      <ViewCommonCode
        open={show}
        viewCodeContent={viewCodeContent}
        onCancel={handleCloseViewCode}
        title={intl.formatMessage({ id: 'playground.viewcode' })}
      ></ViewCommonCode>
    </div>
  );
});

export default GroundVideo;
