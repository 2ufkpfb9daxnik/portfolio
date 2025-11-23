---
title: "競技プログラミングの問題のカテゴリー+α"
---

つい最近の[岩井星人の配信](https://www.youtube.com/watch?v=alaB9VLvFdQ)で[atcoder tags](https://atcoder-tags.herokuapp.com/tags/Searching)というのをngtkanaさんが紹介してくれていて、こういうのは一覧にまとめたくなりがち

知らないとかあんまり合わないという感じのは除く

## 探索

- 全探索
- 二分探索
- 三分探索(高難易度でしか見ない)
- 深さ優先探索
- 幅優先探索
- bit全探索

## 貪欲法

## 文字列アルゴリズム

- ローリングハッシュ
- manacher
- suffix-array
- z-algorithm
- trie
- 構文解析

## 数学

- 整数
- 組み合わせ
- 数え上げ
- 確率
- 期待値
- 行列
- xor

## テクニック

- ソート
- シミュレーション
- 累積和
- imos法
- しゃくとり法
- 再帰関数
- 座標圧縮
- 半分全列挙
- 平方分割
- 分割統治
- ダブリング
- 乱択アルゴリズム

## 構築

## グラフ

- 最短経路
- 最小全域木
- 最小共通祖先
- 強連結成分分解
- トポロジカルソート
- オイラーツアー
- オイラーパス・ハミルトンパス
- HL分解
- 重心分解
- 木の同型判定
- 行列木定理
- 二重連結成分分解
- 二重頂点連結成分分解
- サイクル基底
- dfs木
- エルデシュガライの定理(これたまたま見てみたら該当問題がなかった)

## 動的計画法

- 基礎dp
- 戻すdp
- 文字列dp
- 区間dp
- 桁dp
- 木dp
- 全方位木dp
- bitdp
- 確率dp
- 期待値dp
- 挿入dp
- 連結dp
- インラインdp
- 行列累乗
- convex-hull-trick
- monge-dp
- alien-dp
- きたまさ法
- (一応 viterbi)

## データ構造

- スタック
- キュー
- set
- 辞書、map、hash
- deque
- multiset
- 優先度付きキュー
- union-find
- binary-indexed-tree
- segment-tree
- lazy-segment-tree
- sparse-table
- wavelet行列
- 永続データ構造
- 平衡二分探索木

## ゲーム

- nim
- grundy数
- 後退解析
- minimax法、alphabeta法、negascout

## フロー

- 最大流
- 最小費用流
- 二部マッチング
- 最小カット
- 燃やす埋める

## 幾何学

- 凸包
- 偏角ソート
- ボロノイ図
- 3次元
- ドロネー三角形分割

## マラソン

- 山登り法
- 焼きなまし法
- ビームサーチ

## +αの部分

- 形式的冪級数
- 畳み込み

[こういうのも加えておきたい](https://zenn.dev/baroqueengine/books/a19140f2d9fc1a)ですよね、やっぱり競技プログラミングが全てではないというのはそうなので

他にも例えば

- ニューラルネットワーク
- 誤差逆伝播法
- メルセンヌ・ツイスター
- パーリンノイズ
- 有限要素法
- 最小二乗法
- skip list
- pagerank

なんかもありますね 下からのメディア系とかどんどん応用になっていくと結局(上に記載した)これじゃん!となるかもしれませんが一応書く もとから怪しいですがさらにどんどん怪しいうわべだけの知識になっていくので信用度なしになります

## 圧縮・符号化

- jpeg
- png
- zstandard
- ハフマン符号
- ブロック分割(macroblocks / ctu)
- 離散コサイン変換
- motion estimationにおけるdiamond search, hexagon search
- cabac / cavlc
- reed-solomon

## メディア処理系

私の興味によるところが明らかに大きいが、画像とか

- モザイク
- ブラー
- ライフゲーム

### フィルタ系

- 畳み込み
- ガウシアンフィルタ
- ボックスフィルタ
- メディアンフィルタ
- バイラテラルフィルタ
- ソーベルフィルタ
- ラプラシアンフィルタ
- ガボールフィルタ
- (これまでのものと明らかに違うが、)カルマンフィルタ

### ノイズ除去

- wienerフィルタ
- bm3d

### 画像特徴量・特徴抽出

- fast
- sift
- surf
- orb
- hog

### セグメンテーション

- 大津の2値化
- watershed
- k-means

### 幾何変換・射影

- アフィン変換
- 射影変換
- homography推定

### 3D系

- kd-tree
- octree
- r-tree(空間インデックス)
- interactive closet point
- marching cubes
- poisson surface reconstruction
- catmull-clark subdivision
- loop subdivision
- mesh simplification

### カメラ・投影

- pinhole camela model
- zhang's method
- triangulation
- bundle adjustment
- structure from motion

### レンダリング

- レイトレーシング(whitted-style)
- パストレーシング(モンテカルロ)
- photon mapping
- radiosity
- brdfモデル(lambert, phong, cook-torrance, ggx)
- importace sampling
- shadow mapping
- shadow volumes
- ssao / hbao+ / gtao
- pbr

### GPU/リアルタイム

- rastarization(z-buffer)
- tessellation shaders
- compute shades
- 並列prefix-sum, sort
- deffered rendering
- forward+ / culstered shading

### 動画処理、時系列解析

- フレーム間差分
- optical flow
- 背景差分
- temporal filtering

### オーディオ処理

- フーリエ変換、短時間フーリエ変換
- メル周波数ケプストラム係数
- 線形予測
- 音の立ち上がり検出(onset detection)
- wienerフィルタ

### 古典的な人工知能など

- viola-jones
- サポートベクトル機械

### 深層学習

- cnn
- u-net, segnet
- yolo
- vision transformer
- depth estimation models
- neural radiance fields
- transformer
- word2vec

### 色空間、画像統計

- histgoram equalization
- 局所ヒストグラム平坦化
- pca(次元削減)
- white balance
- gamma correction
- tone mapping(hdr)

### 線形代数

- lu分解
- qr分解
- svd
- 共役勾配

### 暗号

- diffie-helman
- sha-3
- rsa-oaep
- tlsハンドシェイク
