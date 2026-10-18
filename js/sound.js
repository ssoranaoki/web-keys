// 音を鳴らす（Web Audio API ＋ smplr 1.1.0）。
// - ブラウザは「クリックなどの操作の中」でしか音を始めさせない（MDN Web Audio Best practices「Autoplay policy」）。
//   MIDI の鍵盤は操作に数えられない（HTML 仕様 activation triggering input event）ので、最初に start() をクリックで呼ぶ。
// - smplr の setCC(64) はペダルの値を覚えるだけで、音はのばさない。ペダルの「離しても鳴り続ける」はここで作る。
// - 音の流れ: 楽器 → 主音量（VOLUME）→ スピーカー。楽器 → リバーブ（REVERB の量だけ送る）→ 主音量

import { Reverb } from "../vendor/smplr-1.1.0.mjs";
import { findInstrument } from "./instruments.js";

export function createSound({ onProgress, onInstrumentReady }) {
  let context = null;
  let master = null;
  let reverb = null;
  let volume = 0.8;      // 0〜1
  let reverbMix = 0.3;   // 0〜1

  const loaded = new Map();   // 楽器 id → smplr の楽器（読み込み済み）
  const loading = new Map();  // 楽器 id → 読み込み中の Promise
  let current = null;         // 今鳴らす楽器（読み込み済みのもの）
  let wantedId = "grand-piano";

  // ピッチベンドとビブラート。smplr は各音の detune に録音の音程合わせを入れるので、こちらは playbackRate を使う。
  // 最終的な音程 = playbackRate × 2^(detune/1200)（Web Audio 仕様 computedPlaybackRate）
  const BEND_RANGE = 2;        // ±2 半音（General MIDI の標準）
  const VIBRATO_HZ = 5.5;
  const VIBRATO_MAX_CENTS = 40;
  let bendRate = 1;
  let modulation = 0;          // 0〜1
  let vibratoDepth = null;     // LFO の深さ（GainNode）
  const sources = new Set();   // 鳴っている音の AudioBufferSourceNode

  const voices = new Map();   // 鳴っている音 → 止める関数
  const held = new Set();     // 指で押さえている音
  let sustain = false;

  function applyVolume() {
    // 耳の感じ方に近づけるため2乗する
    if (master) master.gain.setTargetAtTime(volume * volume, context.currentTime, 0.02);
  }

  function load(id) {
    if (loaded.has(id)) return Promise.resolve(loaded.get(id));
    if (loading.has(id)) return loading.get(id);
    const inst = findInstrument(id).create(context, {
      destination: master,
      onLoadProgress: ({ loaded: n, total }) => onProgress(id, n, total),
    });
    inst.output.addEffect("reverb", reverb, reverbMix);
    const p = inst.ready.then(() => {
      loaded.set(id, inst);
      loading.delete(id);
      return inst;
    });
    loading.set(id, p);
    return p;
  }

  /** 楽器を選ぶ。読み込みが終わるまでは、前の楽器のまま鳴らす */
  async function select(id) {
    wantedId = id;
    if (!context) return; // まだ始まっていない。start() で読み込む
    const inst = await load(id);
    if (wantedId === id) {
      current = inst;
      onInstrumentReady(id);
    }
  }

  /** クリックの中で呼ぶ。2回目からは何もしない */
  async function start() {
    if (context) {
      if (context.state === "suspended") await context.resume();
      return;
    }
    context = new AudioContext({ latencyHint: "interactive" });
    master = context.createGain();
    master.connect(context.destination);
    applyVolume();
    reverb = Reverb(context);
    reverb.connect(master);
    setUpPitch();
    await select(wantedId);
  }

  /** smplr が音を作るたびに通る入口を作り、ベンドとビブラートを付ける */
  function setUpPitch() {
    const lfo = context.createOscillator();
    lfo.frequency.value = VIBRATO_HZ;
    vibratoDepth = context.createGain();
    vibratoDepth.gain.value = 0;
    lfo.connect(vibratoDepth);
    lfo.start();
    applyModulation();

    const create = context.createBufferSource.bind(context);
    context.createBufferSource = () => {
      const source = create();
      source.playbackRate.value = bendRate;
      vibratoDepth.connect(source.playbackRate); // LFO を足す（AudioParam への接続は値に足される）
      sources.add(source);
      source.addEventListener("ended", () => sources.delete(source));
      return source;
    };
  }

  function applyModulation() {
    if (!vibratoDepth) return;
    // ±cents を playbackRate の幅に直す（今のベンドの高さを基準に）
    const depth = bendRate * (Math.pow(2, (modulation * VIBRATO_MAX_CENTS) / 1200) - 1);
    vibratoDepth.gain.setTargetAtTime(depth, context.currentTime, 0.03);
  }

  function stopVoice(note) {
    const stop = voices.get(note);
    if (stop) {
      stop();
      voices.delete(note);
    }
  }

  return {
    start,
    select,
    get ready() {
      return current !== null;
    },
    setVolume(v) {
      volume = v;
      applyVolume();
    },
    /** value: -1〜+1（0 が真ん中） */
    setPitchBend(value) {
      bendRate = Math.pow(2, (value * BEND_RANGE) / 12);
      if (!context) return;
      for (const s of sources) s.playbackRate.setTargetAtTime(bendRate, context.currentTime, 0.005);
      applyModulation();
    },
    /** value: 0〜1 */
    setModulation(value) {
      modulation = value;
      applyModulation();
    },
    setReverb(v) {
      reverbMix = v;
      for (const inst of loaded.values()) inst.output.setEffectMix("reverb", v);
    },
    noteOn(note, velocity) {
      held.add(note);
      if (!current) return;
      stopVoice(note); // 同じ鍵盤を打ち直したら、前の音を止めてから鳴らす
      voices.set(note, current.start({ note, velocity }));
    },
    noteOff(note) {
      held.delete(note);
      if (!sustain) stopVoice(note);
    },
    setSustain(on) {
      sustain = on;
      if (!on) {
        for (const note of [...voices.keys()]) {
          if (!held.has(note)) stopVoice(note);
        }
      }
    },
    /** 試験用: 今の様子 */
    debug() {
      return {
        context: context?.state,
        current: [...loaded].find(([, i]) => i === current)?.[0] ?? null,
        loaded: [...loaded.keys()],
        voices: [...voices.keys()],
        held: [...held],
        sustain,
        volume,
        reverbMix,
        bendRate,
        modulation,
        sources: sources.size,
      };
    },
  };
}
