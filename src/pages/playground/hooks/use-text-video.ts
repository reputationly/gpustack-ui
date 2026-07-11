import { createAxiosToken } from '@/hooks/use-chunk-request';
import { extractErrorMessage } from '@/pages/playground/config';
import { useOverlayScroller } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import _ from 'lodash';
import { useEffect, useRef, useState } from 'react';
import {
  createVideo,
  getVideoContent,
  getVideoTask,
  uploadVideoInput
} from '../apis';

// Interval between GET /videos/{id} polls. Each GET makes the server refresh the
// task from its instance (poll-on-GET), so this is the effective progress cadence.
const POLL_INTERVAL = 2000;
// Terminal lifecycle states returned by the facade (VideoTaskStateEnum values).
const TERMINAL_STATES = ['done', 'failed', 'canceled'];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function useTextVideo(props: any) {
  const intl = useIntl();
  const { scroller } = props;
  const [loading, setLoading] = useState(false);
  const [tokenResult, setTokenResult] = useState<any>(null);
  const [videoList, setVideoList] = useState<
    {
      dataUrl: string;
      uid: number;
      span?: number;
      loading?: boolean;
      progress?: number;
      preview?: boolean;
    }[]
  >([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const messageId = useRef<number>(0);
  const requestToken = useRef<any>(null);
  const { initialize } = useOverlayScroller();
  const requestIdRef = useRef<number>(0);
  // Track the created object URL so it can be revoked (avoid blob leaks).
  const objectUrlRef = useRef<string>('');

  const revokeCurrentUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }
  };

  useEffect(() => {
    if (scroller.current) {
      initialize(scroller.current);
    }
  }, [initialize]);

  const updateRequestId = () => {
    requestIdRef.current = requestIdRef.current + 1;
    return requestIdRef.current;
  };

  const setMessageId = () => {
    messageId.current = messageId.current + 1;
    return messageId.current;
  };

  const generateNumber = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
  };

  const stopDebounce = _.debounce(() => {
    setVideoList([]);
    setLoading(false);
  }, 200);

  const isStale = (id: number) => requestIdRef.current !== id;

  const setError = (source: any) => {
    setTokenResult({
      error: true,
      errorMessage: extractErrorMessage(source)
    });
    setVideoList([]);
  };

  const submitMessage = async (parameters: any) => {
    // Hoisted so the `finally` guard can tell whether this invocation is still
    // the active one before it touches shared loading state.
    let currentRequestId = requestIdRef.current;
    try {
      if (!parameters.model) return;

      requestToken.current?.cancel?.('cancel');
      requestToken.current = createAxiosToken();
      currentRequestId = updateRequestId();
      setLoading(true);
      setMessageId();
      setTokenResult(null);
      revokeCurrentUrl();

      const newList = [
        {
          dataUrl: '',
          progress: 0,
          loading: true,
          preview: false,
          uid: setMessageId()
        }
      ];

      setVideoList(newList);

      // 0) Materialize any inputs (i2v/s2v/sr/vace) onto shared NFS first, then
      // submit with the returned input_refs. `__inputs` is {field: File[]} and
      // `__taskType` the resolved task_type — both stripped before the submit.
      const rawInputs: Record<string, File[]> = parameters.__inputs || {};
      const taskType: string = parameters.__taskType || '';
      const body: any = _.omit(parameters, ['__inputs', '__taskType']);
      const inputFields = Object.keys(rawInputs).filter(
        (f) => (rawInputs[f] || []).length > 0
      );
      if (inputFields.length) {
        const inputRefs: Record<string, string[]> = {};
        let uploadUserId: any;
        for (const field of inputFields) {
          const up = await uploadVideoInput({
            taskType,
            model: parameters.model,
            field,
            files: rawInputs[field],
            token: requestToken.current.token
          });
          if (isStale(currentRequestId)) return;
          if (!up || up.error || !up.input_refs) {
            setError(up);
            return;
          }
          Object.assign(inputRefs, up.input_refs);
          uploadUserId = up.user_id;
        }
        body.input_refs = inputRefs;
        if (uploadUserId !== undefined) {
          // Submit under the same user_id the uploads were written for, so the
          // facade's tenant-segment check on each ref passes.
          body.user_id = uploadUserId;
        }
      }

      // 1) Submit the job → public task_id.
      const submitRes = await createVideo({
        data: body,
        token: requestToken.current.token
      });
      if (isStale(currentRequestId)) return;
      if (!submitRes || submitRes.error || !submitRes.task_id) {
        setError(submitRes);
        return;
      }

      // 2) Poll GET /videos/{id} until the state is terminal.
      const taskId = submitRes.task_id;
      let status = submitRes.status;
      let latest: any = submitRes;
      while (!TERMINAL_STATES.includes(status)) {
        await sleep(POLL_INTERVAL);
        if (isStale(currentRequestId)) return;
        latest = await getVideoTask({
          id: taskId,
          token: requestToken.current.token
        });
        if (isStale(currentRequestId)) return;
        // A truthy `error` here is just the task's state_message, which the
        // facade sends on non-terminal states too (e.g. "instance lost task;
        // requeued" while status is still queued). Only a missing/malformed
        // response aborts the poll; a real failure surfaces via the terminal
        // `status !== 'done'` branch below (which shows latest.error).
        if (!latest || !latest.status) {
          setError(latest);
          return;
        }
        status = latest.status;
      }

      if (status !== 'done') {
        setTokenResult({
          error: true,
          errorMessage: latest.error || `Video generation ${status}`
        });
        setVideoList([]);
        return;
      }

      // 3) Fetch the result file and turn it into a playable object URL.
      const blob = await getVideoContent({
        id: taskId,
        token: requestToken.current.token
      });
      if (isStale(currentRequestId)) return;
      if (!(blob instanceof Blob)) {
        setError(blob);
        return;
      }
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      newList[0] = {
        ...newList[0],
        dataUrl: url,
        loading: false,
        progress: 100
      };
      setVideoList([...newList]);
    } catch (error) {
      stopDebounce();
      requestToken.current?.cancel?.('cancel');
    } finally {
      // Only the active invocation may clear loading: a stale poll that resumed
      // after `sleep` (superseded by a newer generation) must not turn off the
      // spinner the newer run just turned on. On the plain error path this
      // invocation is still active, so loading is cleared as before.
      if (!isStale(currentRequestId)) {
        setLoading(false);
      }
    }
  };

  const handleClear = () => {
    revokeCurrentUrl();
    setVideoList([]);
    setTokenResult(null);
    setCurrentPrompt('');
  };

  const handleStopConversation = () => {
    requestToken.current?.cancel?.('stop');
  };

  useEffect(() => {
    return () => {
      requestToken.current?.cancel?.('cancel');
      revokeCurrentUrl();
    };
  }, []);

  return {
    loading,
    tokenResult,
    videoList,
    currentPrompt,
    setVideoList,
    setTokenResult,
    setCurrentPrompt,
    handleStopConversation,
    generateNumber,
    handleClear,
    submitMessage
  };
}
