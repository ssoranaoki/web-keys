// 楽器カード・つまみ・ホイール・ペダルの表示。

import { INSTRUMENTS } from "./instruments.js";

/** 楽器カードを並べる。選ばれたら onSelect(id) を呼ぶ */
export function createInstrumentCards(root, { selected, onSelect }) {
  for (const inst of INSTRUMENTS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "instrument";
    button.dataset.id = inst.id;
    button.setAttribute("aria-pressed", String(inst.id === selected));
    // CSS 変数の中の url() は CSS ファイルの場所から数えられるので、ページから数えた完全な URL にして渡す
    const iconUrl = new URL(`assets/icons/${inst.id}.png`, document.baseURI).href;
    const icon = document.createElement("span");
    icon.className = "instrument-icon";
    icon.style.setProperty("--icon", `url("${iconUrl}")`);
    const bar = document.createElement("span");
    bar.className = "instrument-load";
    button.append(icon, inst.label, bar);
    button.addEventListener("click", () => {
      select(inst.id);
      onSelect(inst.id);
    });
    root.appendChild(button);
  }

  const card = (id) => root.querySelector(`.instrument[data-id="${id}"]`);

  function select(id) {
    for (const b of root.querySelectorAll(".instrument")) {
      b.setAttribute("aria-pressed", String(b.dataset.id === id));
    }
  }

  return {
    select,
    /** 読み込みの進み具合（0〜1）。1 で消える */
    setProgress(id, ratio) {
      const c = card(id);
      if (!c) return;
      c.dataset.loading = String(ratio < 1);
      c.style.setProperty("--load", ratio.toFixed(3));
    },
  };
}

/**
 * つまみ。上下ドラッグ・マウスホイール・矢印キーで回す。onChange(0〜1)
 */
export function createKnob(el, { value, label, onChange }) {
  let v = value;
  el.tabIndex = 0;
  el.setAttribute("role", "slider");
  el.setAttribute("aria-label", label);
  el.setAttribute("aria-valuemin", "0");
  el.setAttribute("aria-valuemax", "100");

  function set(next) {
    v = Math.min(1, Math.max(0, next));
    el.style.setProperty("--value", v.toFixed(3));
    el.setAttribute("aria-valuenow", String(Math.round(v * 100)));
    onChange(v);
  }

  let drag = null;
  el.addEventListener("pointerdown", (e) => {
    drag = { y: e.clientY, v };
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener("pointermove", (e) => {
    if (drag) set(drag.v + (drag.y - e.clientY) / 150); // 150px で端から端まで
  });
  const end = () => (drag = null);
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    set(v - Math.sign(e.deltaY) * 0.05);
  }, { passive: false });
  el.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") set(v + 0.05);
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") set(v - 0.05);
    else return;
    e.preventDefault();
  });

  set(v);
  return { set, get value() { return v; } };
}

/** ホイールのつまみを動かす。pos は 0（下）〜 1（上） */
export function setWheel(wheelEl, pos) {
  wheelEl.querySelector(".wheel-thumb").style.setProperty("--pos", pos.toFixed(3));
}

export function setSustain(el, on) {
  el.dataset.on = String(on);
}
