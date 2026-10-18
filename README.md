# Web Keys

USB の MIDI キーボード（KORG microKEY2-49 で確かめています）をさすだけで、ブラウザが楽器になります。
ピアノ・エレピ・オルガン・ストリングス・ベル・パッドを切り替えて弾けます。

**▶ https://ssoranaoki.github.io/web-keys/**

## 使い方
1. MIDI キーボードを USB でつなぎ、上の URL を Chrome か Edge で開く
2. 初回だけ「MIDI の使用を許可」→ 鍵盤の上の「クリックして音を出す」をクリック
3. 弾く。楽器はカードで切り替え、VOLUME・REVERB は上下ドラッグかマウスホイールで回す

- 強弱・ダンパー・ペダル（CC64）・ピッチベンド（±2 半音）・モジュレーション（ビブラート）に対応
- Safari は Web MIDI API に対応していないため使えません
- 楽器の音は、弾くときにそれぞれの配布元から読み込みます（ネットが必要）
- Bluetooth のイヤホン・スピーカーは音が遅れます。パソコン本体のスピーカーか、線でつなぐイヤホンがおすすめです

## 使っているもの
- [smplr](https://github.com/danigb/smplr) 1.1.0（MIT）— `vendor/` に同梱。詳しくは `vendor/smplr-NOTICE.txt`
- 音の素材（弾くときに配布元から読み込みます。このリポジトリには含みません）
  - グランドピアノ: [SplendidGrandPiano](https://github.com/sfzinstruments/SplendidGrandPiano) — AKAI が公開した Steinway の録音（パブリックドメイン）
  - エレクトリックピアノ: [Greg Sullivan E-Pianos](https://github.com/sfzinstruments/GregSullivan.E-Pianos)（Wurlitzer EP200）— Greg Sullivan、[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)
  - オルガン・ストリングス・ベル・パッド: [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) の MusyngKite — [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
