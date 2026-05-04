---
title: "セル・オートマトンで音楽を作成する"
---

# セル・オートマトンで音楽を作成する

[完全にこれの受け売りであるわけだが...](https://www.youtube.com/watch?v=AxH9Z6veKf8)

見て感動したので、記念に書いておく。実際に実行したし。rule30というのをyoutubeで普通に検索するとことぶき光以外の普通にそういう現象としてただビジュアライズしている動画はたくさんあるけど、これに調性付きの音をつけてやるという発想はなかった。

## セル・オートマトンについて今回必要な部分だけを概説

一般性を捨てて言うと、1次元のマスが無限に並んでいて、それぞれには0か1が書かれている。これからステップを進めていくとき、次のステップでのマスの状態は、今のステップでの自分と両隣のマスの状態によって決まる。

例えば、rule30は、次のようなルールで状態が決まる。

| 左 | 真ん中 | 右 | 次の(真ん中の)状態 |
|---|---|---|---|
| 0 | 0 | 0 | 0 |
| 0 | 0 | 1 | 1 |
| 0 | 1 | 0 | 1 |
| 0 | 1 | 1 | 1 |
| 1 | 0 | 0 | 0 |
| 1 | 0 | 1 | 1 |
| 1 | 1 | 0 | 1 |
| 1 | 1 | 1 | 0 |

これは1ステップごとに全てのマスに適用される。

初期状態によっていろいろ出来るが、例えば、初期状態が真ん中だけ1であとは0のときというのを考えると、ステップを進めるにつれてどんどん長さは拡大していく。

このルールは、ルールを表す8ビットの数値で表すことができる。例えば、rule30は、00011110というビット列で表される。これを10進数にすると30になるので、rule30という名前がついている。

## 音楽にする

動画では、真ん中を含めて横に19マス分を切り取って考える。ステップを進めると縦の行になって(過去の結果も11回再利用する)、最終的に19*12のマスができる。

縦の位置によって音の高さを決める。そして切り取った19マスの一番左縦1列から右に向かって、マスの立ち上がりビットを検出したときに音を鳴らす。一番右に来たらもう一度左に戻る(コード中ではワープと書く)。音の高さは固定では無く、左に戻ったときに変更される。どれに変更されるか？というのは適当にコード進行とかで検索するとかすればよい。機能和声の理論については詳しくないため動画でどういう感じなのかは不明であるが、俺はaiに色々聞いた。

## 実装

こういう変なことをできそうなライブラリがほぼ確実にありそうなのでpythonを使う。いや音を出すというのは変ではないが、midiを使いたかった。

まず[fluidsynthというソフト](https://www.fluidsynth.org)を落としてくる。binをいい感じの場所に置く。今回はそんなにずっと使うわけじゃないのでpathは通さずプログラムのルートディレクトリにそのままおいた。

音源は[MuseScore_General.sf3](https://musescore.org/ja/print/book/export/html/278624)を使う。プログラムと同じディレクトリにおいた。これも特に理由は無いが昔musescoreは使ったことがあるので

pythonのライブラリはmidoというのがいいらしいので使う numpyも計算用で入れとく

まず音階を作る関数:

```python
def build_scale(root_pc, intervals):
    scale = []
    base = 48 + root_pc
    if root_pc > 5:
        base -= 12
        
    octave = 0
    while len(scale) < WARP_HISTORY_MAX:
        for iv in intervals:
            if len(scale) >= WARP_HISTORY_MAX: 
                break
            scale.append(base + (octave * 12) + iv)
        octave += 1
        
    return sorted(scale, reverse=True)
```

引数:

- root_pc (int): ルート音のピッチクラス（C=0, C#=1, ..., B=11）。
- intervals (list[int]): ルート音からの半音間隔の配列（例: メジャーペンタトニックなら [0, 2, 4, 7, 9]）。

MIDIノート番号 48 (C3) を基準値とし、指定された root_pc と intervals を用いてノート番号を算出します。オクターブを増やしながら、要素数が WARP_HISTORY_MAX（デフォルト12）に達するまで配列に格納（高音域を避けるため root_pc > 5 の場合は基準値を1オクターブ下げる）。

返り値: list[int]。生成されたノート番号の配列。画面の上部から下部へマッピングするため、降順（reverse=True）にソートして返却します。

次にセルオートマトンの関数:

```python
def rule30(left, center, right):
    state = (left << 2) | (center << 1) | right
    rules = [0, 1, 1, 1, 1, 0, 0, 0]
    return rules[state]

def step(cells):
    expanded = [0] + cells + [0]
    n = len(expanded)
    new_cells = [0] * n
    for i in range(n):
        left = expanded[i - 1] if i > 0 else 0
        center = expanded[i]
        right = expanded[i + 1] if i < n - 1 else 0
        new_cells[i] = rule30(left, center, right)
    return new_cells
```

rule30の引数は左、真ん中、右の状態を表す0か1の整数。これらをビットシフトとビット演算で一つの整数 state にまとめ、その state をインデックスとしてルール配列から次の真ん中のマスの状態を返す。

stepの引数は現在のマスの状態を表す0と1のリスト。両端に0を追加して番兵とし、各マスについて左、真ん中、右の状態を rule30 に渡して新しい状態を new_cells に格納して返す。

あとはIO周りの関数:

```python
def start_fluidsynth():
    if not FLUIDSYNTH_AUTO_START: return None
    try:
        return subprocess.Popen(
            [FLUIDSYNTH_PATH, "-i", "-a", "dsound", "-m", "winmm", SOUNDFONT_PATH],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
    except Exception as e:
        print(f"FluidSynth起動エラー: {e}")
        return None

def open_midi_output():
    output_names = mido.get_output_names()
    if not output_names: raise RuntimeError("MIDI出力ポートが見つかりません")
    preferred = None
    for name in output_names:
        if MIDI_PORT_NAME.lower() in name.lower():
            preferred = name
            break
    if preferred is None:
        preferred = output_names[0]
    return mido.open_output(preferred)

def sleep_until(target_time):
    now = time.monotonic()
    if target_time > now:
        time.sleep(target_time - now)
```

- start_fluidsynthはFLUIDSYNTH_AUTO_STARTがTrueの場合にsubprocess.Popenを使ってFluidSynthを起動する。
- open_midi_outputは利用可能なMIDI出力ポートを取得し、MIDI_PORT_NAMEが含まれる名前の仮想MIDIポートを優先して開く。見つからない場合は最初のポートを開く。
- sleep_untilは指定されたtarget_timeまで現在の時間を取得し、必要に応じてsleepする。これはいらないようにも思えるが結構音声再生はずれるので要る。

```python
while True:
    current_scale = current_sequence[chord_index]
    
    prev_states = [0] * len(display_history)
    loop_start = time.monotonic()
    
    # 1画面（ワープ）分の列を左から右へ走査
    for col in range(WIDTH):
        col_start = loop_start + (col * COL_DURATION)
        sleep_until(col_start) # テンポ同期

        midi_notes = []

        # 全行を縦にチェックし、発音タイミングを検出
        for row in range(len(display_history)):
            line = display_history[row]
            # 現在のセルが1(*)かどうかを判定
            current = 1 if col < len(line) and line[col] == '*' else 0
            
            # 立ち上がり検出して0->1のときのみ音を鳴らす
            if prev_states[row] == 0 and current == 1:
                midi_note = current_scale[row % len(current_scale)]
                midi_notes.append(midi_note)
            
            # 次の列の判定のために状態を保存
            prev_states[row] = current
        
        # 発音制御 (Note On -> 待機 -> Note Off)
        if midi_notes:
            for note in midi_notes:
                outport.send(mido.Message("note_on", note=note, velocity=80))

        sleep_until(col_start + COL_DURATION) # 1列分

        if midi_notes:
            for note in midi_notes:
                outport.send(mido.Message("note_off", note=note, velocity=0))
    
    # ワープ完了後の処理
    cells = step(cells)
  
    #...(その他完了後の更新処理)

    # コード進行を次に進める
    chord_index += 1
    if chord_index >= len(current_sequence):
        # 次のコードを適当に選ぶ
```

## 動画

[限定公開](https://www.youtube.com/watch?v=hXeUdjurP0Q)

【隅付き括弧で囲まれてる】のが1つのコード進行

## 感想

こんな単純なルールでここまで(割と聞ける)のが出来るのはすごいと思った。バリエーションは無限ですし
