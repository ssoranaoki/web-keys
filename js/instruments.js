// 楽器の一覧と、smplr での作り方。
// 音のもと: SplendidGrandPiano（Steinway）、ElectricPiano（GregSullivan E-Pianos）、
// Soundfont（gleitz/midi-js-soundfonts の MusyngKite。General MIDI の楽器名）。

import { SplendidGrandPiano, ElectricPiano, Soundfont } from "../vendor/smplr-1.1.0.mjs";

export const INSTRUMENTS = [
  { id: "grand-piano", label: "Grand Piano", create: (ctx, o) => SplendidGrandPiano(ctx, o) },
  { id: "electric-piano", label: "Electric Piano", create: (ctx, o) => ElectricPiano(ctx, { ...o, instrument: "WurlitzerEP200" }) },
  { id: "organ", label: "Organ", create: (ctx, o) => Soundfont(ctx, { ...o, instrument: "drawbar_organ" }) },
  { id: "strings", label: "Strings", create: (ctx, o) => Soundfont(ctx, { ...o, instrument: "string_ensemble_1" }) },
  { id: "bells", label: "Bells", create: (ctx, o) => Soundfont(ctx, { ...o, instrument: "tubular_bells" }) },
  { id: "pad", label: "Pad", create: (ctx, o) => Soundfont(ctx, { ...o, instrument: "pad_2_warm" }) },
];

export function findInstrument(id) {
  return INSTRUMENTS.find((i) => i.id === id);
}
