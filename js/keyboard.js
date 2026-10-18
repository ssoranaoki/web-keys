// 画面の49鍵。手元の鍵盤と同じ鍵盤を光らせる。
// オクターブ・ボタンで手元の音域が動いたら、画面の音域も付いていく。

const KEY_COUNT = 49;               // C〜C の4オクターブ＋1
const BLACK_IN_OCTAVE = new Set([1, 3, 6, 8, 10]);
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function noteName(note) {
  return NAMES[note % 12] + (Math.floor(note / 12) - 1); // 60 = C4
}

export function createKeyboard({ root, lowLabel, highLabel, startNote = 36 }) {
  let low = startNote;            // いちばん左の鍵盤（C）
  const active = new Map();       // 押されている音 → 強さ（0〜1）

  function render() {
    root.textContent = "";
    const whites = [];
    const blacks = [];
    for (let i = 0; i < KEY_COUNT; i++) {
      const note = low + i;
      const el = document.createElement("div");
      el.dataset.note = String(note);
      if (BLACK_IN_OCTAVE.has(note % 12)) {
        el.className = "key-black";
        blacks.push({ el, whiteIndex: whites.length }); // 直前の白鍵の右側に置く
      } else {
        el.className = "key-white";
        whites.push(el);
      }
    }
    whites.forEach((el) => root.appendChild(el));
    const w = 100 / whites.length;
    for (const { el, whiteIndex } of blacks) {
      el.style.width = `${w * 0.6}%`;
      el.style.left = `${w * whiteIndex - w * 0.3}%`;
      root.appendChild(el);
    }
    lowLabel.textContent = noteName(low);
    highLabel.textContent = noteName(low + KEY_COUNT - 1);
    for (const [note, v] of active) paint(note, v);
  }

  function keyEl(note) {
    return root.querySelector(`[data-note="${note}"]`);
  }

  function paint(note, v) {
    const el = keyEl(note);
    if (!el) return;
    el.classList.add("is-on");
    el.style.setProperty("--v", v.toFixed(2));
  }

  /** 画面の外の音が来たら、オクターブ単位で音域を動かす */
  function follow(note) {
    const high = low + KEY_COUNT - 1;
    let next = low;
    if (note < low) next = low - 12 * Math.ceil((low - note) / 12);
    else if (note > high) next = low + 12 * Math.ceil((note - high) / 12);
    next = Math.max(0, Math.min(127 - (KEY_COUNT - 1), next));
    if (next !== low) {
      low = next;
      render();
    }
  }

  render();

  return {
    press(note, velocity) {
      follow(note);
      const v = velocity / 127;
      active.set(note, v);
      paint(note, v);
    },
    release(note) {
      active.delete(note);
      const el = keyEl(note);
      if (el) el.classList.remove("is-on");
    },
    get range() {
      return { low, high: low + KEY_COUNT - 1 };
    },
  };
}
