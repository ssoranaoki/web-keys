// 全体のつなぎ。MIDI の出来事 → 画面と音。

import { startMidi, handleMessage } from "./midi.js";
import { createKeyboard } from "./keyboard.js";
import { createInstrumentCards, createKnob, setWheel, setSustain } from "./controls.js";
import { createSound } from "./sound.js";
import { findInstrument } from "./instruments.js";

const $ = (id) => document.getElementById(id);
const FIRST = "grand-piano";

const keyboard = createKeyboard({
  root: $("keyboard"),
  lowLabel: $("range-low"),
  highLabel: $("range-high"),
});

// ---- 音 ----
const startButton = $("sound-start");
let firstLoadId = null; // 最初のクリックで読み込んでいる楽器（覆いに進み具合を出す）

const sound = createSound({
  onProgress: (id, loaded, total) => {
    cards.setProgress(id, loaded / total);
    if (id === firstLoadId) {
      $("sound-start-fill").style.width = `${Math.round((loaded / total) * 100)}%`;
      $("sound-start-sub").textContent = `${loaded} / ${total}`;
    }
  },
  onInstrumentReady: (id) => cards.setProgress(id, 1),
});

const cards = createInstrumentCards($("instruments"), {
  selected: FIRST,
  onSelect: (id) => {
    sound.select(id).catch((err) => {
      console.error(err);
      cards.setProgress(id, 1);
    });
  },
});

createKnob($("knob-volume"), { value: 0.8, label: "VOLUME", onChange: (v) => sound.setVolume(v) });
createKnob($("knob-reverb"), { value: 0.3, label: "REVERB", onChange: (v) => sound.setReverb(v) });

// ---- 音を始める（最初の1回だけクリック） ----
async function startSound() {
  if (startButton.hidden || startButton.dataset.state === "loading") return;
  startButton.dataset.state = "loading";
  const selected = document.querySelector('.instrument[aria-pressed="true"]')?.dataset.id ?? FIRST;
  firstLoadId = selected;
  $("sound-start-main").textContent = `${findInstrument(selected).label} を読み込んでいます…`;
  $("sound-start-sub").textContent = "";
  try {
    await sound.start();
    startButton.hidden = true;
  } catch (err) {
    console.error(err);
    startButton.dataset.state = "";
    $("sound-start-main").textContent = "読み込めませんでした。クリックしてもう一度";
    $("sound-start-sub").textContent = "ネットにつながっているか確かめてください";
  }
}
startButton.addEventListener("click", startSound);
// キーボードのキーを押しても始められる（keydown も操作に数えられる）
window.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") startSound();
});

// ---- 表示 ----
function setStatus(state, detail) {
  $("status").dataset.state = state;
  $("status-text").textContent = state === "connected" ? `connected: ${detail}` : detail;
}

const handlers = {
  onStatus: setStatus,
  onNoteOn: (note, velocity) => {
    sound.noteOn(note, velocity);
    keyboard.press(note, velocity);
  },
  onNoteOff: (note) => {
    sound.noteOff(note);
    keyboard.release(note);
  },
  onPitchBend: (value) => {
    sound.setPitchBend(value);
    setWheel($("wheel-pitch"), (value + 1) / 2);
  },
  onModulation: (value) => {
    sound.setModulation(value);
    setWheel($("wheel-mod"), value);
  },
  onSustain: (on) => {
    sound.setSustain(on);
    setSustain($("sustain"), on);
  },
};

startMidi(handlers);

// 試験用: 鍵盤がなくても、開発者ツールから MIDI の信号を流し込める
// 例: webKeys.send([0x90, 60, 100])
window.webKeys = { send: (bytes) => handleMessage(bytes, handlers), keyboard, sound };
