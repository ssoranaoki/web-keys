// MIDI の受け取り（Web MIDI API）。
// つながっている入力すべてを聞き、信号を「意味のある出来事」に直して handlers へ渡す。

/**
 * @param {object} handlers
 * @param {(state: string, detail?: string) => void} handlers.onStatus
 * @param {(note: number, velocity: number) => void} handlers.onNoteOn   velocity は 1〜127
 * @param {(note: number) => void} handlers.onNoteOff
 * @param {(value: number) => void} handlers.onPitchBend  -1〜+1（0 が真ん中）
 * @param {(value: number) => void} handlers.onModulation 0〜1
 * @param {(on: boolean) => void} handlers.onSustain
 */
export async function startMidi(handlers) {
  if (!navigator.requestMIDIAccess) {
    handlers.onStatus("error", "このブラウザは MIDI に対応していません（Chrome か Edge で開いてください）");
    return null;
  }
  if (!window.isSecureContext) {
    handlers.onStatus("error", "localhost か https で開いてください");
    return null;
  }

  let access;
  try {
    access = await navigator.requestMIDIAccess();
  } catch (err) {
    handlers.onStatus("error", "MIDI の使用が許可されませんでした（アドレスバーの鍵マークから許可できます）");
    return null;
  }

  const listen = () => {
    const names = [];
    for (const input of access.inputs.values()) {
      if (input.state !== "connected") continue;
      input.onmidimessage = (event) => handleMessage(event.data, handlers);
      names.push(input.name);
    }
    if (names.length > 0) {
      handlers.onStatus("connected", names.join(", "));
    } else {
      handlers.onStatus("no-device", "鍵盤が見つかりません。USB でつないでください");
    }
  };

  access.onstatechange = listen; // さし直し・つなぎ直しを追いかける
  listen();
  return access;
}

/** MIDI の信号（バイト列）を出来事に直す。試験のときは直接呼べる。 */
export function handleMessage(data, handlers) {
  const [status, d1 = 0, d2 = 0] = data;
  const type = status & 0xf0;

  if (type === 0x90 && d2 > 0) {
    handlers.onNoteOn(d1, d2);
  } else if (type === 0x80 || (type === 0x90 && d2 === 0)) {
    handlers.onNoteOff(d1);
  } else if (type === 0xe0) {
    const value14 = (d2 << 7) | d1; // 0〜16383、真ん中は 8192
    handlers.onPitchBend((value14 - 8192) / (value14 >= 8192 ? 8191 : 8192));
  } else if (type === 0xb0) {
    if (d1 === 1) handlers.onModulation(d2 / 127);
    else if (d1 === 64) handlers.onSustain(d2 >= 64);
  }
}
