// preset backend parameters for built-in backends
import llamaParameters from './llama';
import mindieParameters from './mindie';
import sglangParameters from './sglang';
import vllmParameters from './vllm';

/**
 * backend label map
 */
export const backendOptionsMap = {
  llamaBox: 'llama-box',
  vllm: 'vLLM',
  voxBox: 'VoxBox',
  ascendMindie: 'MindIE',
  custom: 'Custom',
  SGLang: 'SGLang',
  // Must match the backend name returned by the API (BackendEnum.LIGHTX2V).
  lightX2V: 'LightX2V',
  // Must match the backend name returned by the API (BackendEnum.ACESTEP).
  aceStep: 'ACEStep',
  // Must match the backend name returned by the API (BackendEnum.VLLM_OMNI).
  vllmOmni: 'vLLMOmni',
  // Must match the backend name returned by the API (BackendEnum.BERNINI).
  bernini: 'Bernini',
  // Must match the backend name returned by the API (BackendEnum.INDEXTTS).
  indexTTS: 'IndexTTS'
};

// for checking built-in backends when selecting a gguf
export const BuiltInBackendOptions = [
  backendOptionsMap.vllm,
  backendOptionsMap.ascendMindie,
  backendOptionsMap.SGLang,
  backendOptionsMap.voxBox
];

export interface BackendParameter {
  label: string;
  value: string;
  options?: Array<string | number>;
}

const generateBackendParameters = (options: BackendParameter[]) => {
  return options.map((option) => {
    return {
      label: option.label,
      value: option.value,
      opts: option.options?.map((opt) => {
        return {
          label: opt,
          value: opt
        };
      })
    };
  });
};

export default {
  [backendOptionsMap.llamaBox]: generateBackendParameters(llamaParameters),
  [backendOptionsMap.vllm]: generateBackendParameters(vllmParameters),
  [backendOptionsMap.ascendMindie]: generateBackendParameters(mindieParameters),
  [backendOptionsMap.voxBox]: [],
  [backendOptionsMap.custom]: [],
  [backendOptionsMap.SGLang]: generateBackendParameters(sglangParameters)
};
