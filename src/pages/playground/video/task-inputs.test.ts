import { describe, expect, it } from 'vitest';
import {
  inferVideoTaskType,
  R2VA_MAX_TOTAL_REFS,
  validateVideoInputs,
  VideoTaskType
} from './task-inputs';

// The validator only ever counts files, never reads them.
const files = (spec: Record<string, number>): Record<string, File[]> =>
  Object.fromEntries(
    Object.entries(spec).map(([field, n]) => [
      field,
      Array.from({ length: n }, () => ({}) as File)
    ])
  );

describe('inferVideoTaskType', () => {
  describe('explicit meta.task_type', () => {
    it('wins over the model name when recognized', () => {
      expect(
        inferVideoTaskType('minimax-h3-fl2va', { task_type: 'l2va' })
      ).toBe('l2va');
      expect(
        inferVideoTaskType('some-bernini-deploy', { task_type: 'r2v' })
      ).toBe('r2v');
    });

    it('is case-insensitive', () => {
      expect(inferVideoTaskType('anything', { task_type: 'R2VA' })).toBe(
        'r2va'
      );
    });

    // meta is unvalidated free-form JSON and this very key carries an unrelated
    // vocabulary elsewhere (meta_registry writes "CustomVoice" for Qwen3-TTS),
    // so an unrecognized value must degrade to name inference rather than leak
    // through as a task_type the facade would reject.
    it.each([
      ['CustomVoice', 'minimax-h3-ref2va', 'r2va'],
      ['t2va', 'minimax-h3-fl2va', 't2v'],
      ['ref2va', 'minimax-h3-ref2va', 'r2va'],
      ['typo', 'wan-i2v', 'i2v'],
      ['', 'seedvr2', 'sr']
    ])(
      'ignores unrecognized %p and infers from the name',
      (pinned, name, want) => {
        expect(inferVideoTaskType(name, { task_type: pinned })).toBe(want);
      }
    );

    it('treats missing meta as absent', () => {
      expect(inferVideoTaskType('wan-i2v')).toBe('i2v');
      expect(inferVideoTaskType('wan-i2v', {})).toBe('i2v');
    });
  });

  // Token order must stay identical to new-api's inferTaskType, or the two
  // disagree on the same deploy.
  describe('name inference', () => {
    it.each<[string, VideoTaskType]>([
      ['infinitetalk-480p', 's2v'],
      ['some-s2v-model', 's2v'],
      ['seedvr2-3b', 'sr'],
      ['upscaler-sr', 'sr'],
      ['foo-bar-sr', 'sr'],
      ['ltx2-v2a', 'v2a'],
      ['my-dub-model', 'v2a'],
      ['wan2.2-vace', 'vace'],
      ['minimax-h3-ref2va', 'r2va'],
      ['wan-flf2v', 'flf2v'],
      ['wan2.2-i2v-a14b', 'i2v'],
      ['wan2.2-t2v-a14b', 't2v'],
      ['something-unknown', 't2v'],
      ['', 't2v']
    ])('%p -> %p', (name, want) => {
      expect(inferVideoTaskType(name)).toBe(want);
    });

    // The fl2va PARTITION serves t2va + fl2va, and fl2va itself covers
    // i2v/l2va/flf2v. The name cannot say which, so t2v (zero-input, always
    // submittable) is the only safe default — the playstyle selector is what
    // reaches the other three.
    it('falls back to t2v for the H3 fl2va partition', () => {
      expect(inferVideoTaskType('minimax-h3-fl2va')).toBe('t2v');
    });

    // Bernini serves six playstyles from one model; same reasoning.
    it('falls back to t2v for Bernini', () => {
      expect(inferVideoTaskType('bernini-video-1')).toBe('t2v');
    });
  });
});

describe('validateVideoInputs', () => {
  const ok = (taskType: VideoTaskType, spec: Record<string, number> = {}) =>
    expect(validateVideoInputs(taskType, files(spec))).toBeNull();

  const fails = (
    taskType: VideoTaskType,
    spec: Record<string, number>,
    id: string
  ) =>
    expect(validateVideoInputs(taskType, files(spec))).toMatchObject({
      id: `playground.video.input.${id}`
    });

  it('passes zero-input task types', () => {
    ok('t2v');
  });

  describe('required fields', () => {
    it('names the missing field by its label key', () => {
      expect(validateVideoInputs('i2v', {})).toEqual({
        id: 'playground.video.input.required',
        labelIdValues: { field: 'playground.video.input.image' }
      });
    });

    it('accepts a satisfied requirement', () => {
      ok('i2v', { image: 1 });
    });

    it('reports the FIRST missing field of several', () => {
      expect(validateVideoInputs('s2v', files({ image: 1 }))).toMatchObject({
        labelIdValues: { field: 'playground.video.input.audio' }
      });
      expect(validateVideoInputs('s2v', files({}))).toMatchObject({
        labelIdValues: { field: 'playground.video.input.portrait' }
      });
    });
  });

  describe('vace', () => {
    it('needs a source video or reference images', () => {
      fails('vace', {}, 'vaceRequired');
      ok('vace', { src_video: 1 });
      ok('vace', { src_ref_images: 2 });
    });

    it('rejects a mask without a source video', () => {
      fails('vace', { src_ref_images: 1, src_mask: 1 }, 'maskNeedsVideo');
      ok('vace', { src_video: 1, src_mask: 1 });
    });

    // Precedence: a mask-only selection violates BOTH rules, and the more basic
    // "you gave me nothing to work on" message is the useful one.
    it('reports vaceRequired before maskNeedsVideo', () => {
      fails('vace', { src_mask: 1 }, 'vaceRequired');
    });
  });

  describe('mv2v / ads2v', () => {
    it.each<VideoTaskType>(['mv2v', 'ads2v'])('%s needs exactly two', (t) => {
      // Zero videos trips the required-field rule first, which is the clearer
      // message; one or three trips the count rule.
      fails(t, {}, 'required');
      fails(t, { src_video: 1 }, 'needTwoVideos');
      fails(t, { src_video: 3 }, 'needTwoVideos');
      ok(t, { src_video: 2 });
    });

    it('carries the task type into the message', () => {
      expect(
        validateVideoInputs('ads2v', files({ src_video: 1 }))
      ).toMatchObject({ values: { type: 'ads2v' } });
    });
  });

  describe('r2va', () => {
    // The engine requires >=1 image or video (_validate_ref2va_reference_counts)
    // and the FACADE does not check it, so an audio-only submit would otherwise
    // reach the engine only after uploading to NFS and taking a queue slot.
    it('rejects audio-only and empty selections', () => {
      fails('r2va', {}, 'r2vaRequired');
      fails('r2va', { audio: 3 }, 'r2vaRequired');
    });

    it('accepts an image or a video reference', () => {
      ok('r2va', { image: 1 });
      ok('r2va', { video: 1 });
      ok('r2va', { image: 1, audio: 1 });
    });

    // Per-field caps sum to 15 (9+3+3) but the engine total is 12, so every
    // field can be within its cap while the request is still over.
    it('rejects more than the cross-modal total', () => {
      fails('r2va', { image: 9, video: 3, audio: 3 }, 'r2vaTooManyRefs');
      expect(
        validateVideoInputs('r2va', files({ image: 9, video: 3, audio: 3 }))
      ).toMatchObject({ values: { max: R2VA_MAX_TOTAL_REFS, total: 15 } });
    });

    it('accepts exactly the total', () => {
      ok('r2va', { image: 9, video: 3 });
      ok('r2va', { image: 6, video: 3, audio: 3 });
    });
  });
});
