# Knucklebonesを解く学習アルゴリズムの比較調査

## TL;DR

- Knucklebonesは「盤面は完全に見える（**完全情報**）が、次に出るダイスの目は分からない（**確率的**）」というタイプのゲームで、バックギャモンや`EinStein würfelt nicht!`（以下EWN、ダイスで動かす駒を使う抽象戦略ゲーム）と同じ分類に入る[^1][^6]。
- この分類のゲームでは、相手の手札を推測する必要がある**不完全情報ゲーム**向けの手法（CFR等）は本質的には不要で、**確率ノード（ダイスの出目）を明示的に扱う探索・学習手法**が主流[^8]。
- 実際にKnucklebones専用に作られた実装が複数見つかった。MCTS・Q学習・DQNを試したもの[^9]、ミニマックス探索に出目の期待値重み付けを組み合わせたもの[^10][^11]があり、いずれもゼロから作る前に参考にできる。
- 「広く浅く」比較した結果、初手の選択肢は大きく分けて3系統: **(A) 探索ベース**（Expectimax/*-Minimax、学習なしでも動く）、**(B) 自己対戦+価値関数学習**（TD学習、AlphaZero/MuZero系）、**(C) モデルフリー深層RL**（PPO・DQN等）。トレードオフは本文の比較表を参照。

## 用語集（初出順）

- **完全情報ゲーム** = 全プレイヤーが盤面の全情報を見られるゲーム（例: 将棋、バックギャモン）。トランプのように相手の手札が見えない**不完全情報ゲーム**と対になる概念。
- **確率ノード（chance node）** = ゲーム木の中で、プレイヤーではなく「運」（ダイス等）が次の分岐を決めるノード。
- **MCTS（Monte Carlo Tree Search）** = ランダムなプレイアウト（シミュレーション）を多数回行い、その結果の統計からどの手が良いかを推定する探索アルゴリズム。
- **Expectimax** = Minimax探索（自分は最大化・相手は最小化）を確率ノードに拡張したもの。確率ノードでは「各結果の評価値を発生確率で重み付き平均する」[^3]。
- ***-Minimax（Star1/Star2/Star2.5）** = Expectimaxに、Minimaxのalpha-beta枝刈りに相当する高速化を組み込んだアルゴリズム群[^4]。
- **TD学習（Temporal Difference Learning）** = 「今の局面の評価値」と「次の局面の評価値」の差（TD誤差）を使って評価関数を更新していく学習方法。バックギャモンで有名になった[^1]。
- **AlphaZero / MuZero** = 深層ニューラルネットワークとMCTSを組み合わせ、自己対戦のみで強くなる手法群。MuZeroは環境のルール自体もニューラルネットで学習する点がAlphaZeroと異なる。
- **自己対戦（self-play）** = 学習中のエージェント同士を対戦させ、その結果を学習データにする方式。
- **CFR（Counterfactual Regret Minimization）** = 不完全情報ゲームでナッシュ均衡に近い戦略を求める学習手法。ポーカー等で使われる。

## 比較表

| 手法 | 概要 | Knucklebonesとの相性 | 実装難易度（PyTorch） | 計算資源・サンプル効率 | 実績・参考事例 | 主なリスク・注意点 |
| --- | --- | --- | --- | --- | --- | --- |
| **Expectimax / \*-Minimax（探索+評価関数、学習なし）** | ゲーム木を数手先まで展開し、確率ノードでは出目の期待値を取って評価する古典的探索[^3][^4] | 高い。ダイスの出目が1〜6の一様分布で既知なので確率ノードの計算が単純。盤面が小さく数手先まで読み切りやすい | 低〜中。学習ループ不要、探索+手作り評価関数のみでよい | 学習データ不要。探索コスト（分岐数×深さ）が計算資源の中心。Knucklebones専用実装で深さ4〜6・約110msの実測あり[^10][^11] | Knucklebones専用に2つ実装済み: 深さ4のヒューリスティックminimax[^11]、深さ2〜6のmean-weighting minimax（深さ5でalpha-beta等なしの素朴な比較対象に対し49/100勝、ほぼ互角という報告）[^10] | 評価関数の質に性能が直結する。倍化・3倍化のシナジーを過小評価したり、相手の相殺による盤面変化を過大/過小評価する既知のバグ報告あり[^11] |
| **TD学習（自己対戦+学習した価値関数、探索は浅い/なしでも可）** | 自己対戦で得た結果をTD誤差でニューラルネット評価関数に反映していく。バックギャモン（約10^20状態、完全情報+確率）で人間トップ級に到達した実績を持つ古典的手法[^1][^2] | 高い。バックギャモンと同じ「完全情報+確率+得点を競う」構造で、Knucklebonesは状態数がはるかに小さい（後述§状態空間の規模） | 中。評価関数（NN）+TD更新則の実装は比較的シンプルだが、自己対戦ループの設計は必要 | サンプル効率は比較的良い。バックギャモンでは150万局の自己対戦で強豪級に到達したとの報告[^1] | バックギャモンでの実績[^1][^2]。Knucklebones特化の公開実装は今回の調査では確認できず | 深い探索と組み合わせない場合、終盤の細かい読みが弱くなる可能性（要検証、未確認） |
| **AlphaZero/MuZero系 自己対戦MCTS（確率ノード拡張あり）** | 方策・価値をNNで出し、それをMCTSでさらに改善しながら自己対戦するAlphaZeroを、確率ノードを扱えるよう拡張したもの。NDMZは確率を「もう1人のプレイヤー」として木に組み込む方式[^7]、Stochastic MuZeroは決定ノードと確率ノードを明示的に区別してPUCTと事前分布サンプリングを使い分ける方式[^2] | 中〜高。理論的には最も表現力が高いが、確率ノード拡張は原論文の再実装より複雑 | 高。MCTS実装＋NN＋確率ノード対応をゼロから書く必要があり、本リポジトリで最も実装コストが高い選択肢 | 高い計算資源を要求しやすい（自己対戦生成+NN学習の反復）。Knucklebonesのように状態数が比較的小さいゲームでは、この重厚な仕組みが過剰投資になる可能性がある（推測ではなく一般的なトレードオフとして; 個別の実測比較は未確認） | 類似ゲーム（EWN、確率×完全情報の抽象戦略ゲーム）で、AlphaZero系実装（Polygames）を含む比較実験があり、そこでは後述のDescent系探索手法がAlphaZero系を上回ったと報告されている[^6] | 実装・デバッグコストが高く、確率ノードの扱いを誤ると学習が破綻しやすい。小規模ゲームでは費用対効果が見合わない可能性 |
| **PPO / Actor-Critic系 自己対戦（モデルフリー方策勾配）** | 探索木を使わず、方策と価値をNNで直接学習する。汎用性が高く多くのゲームに適用実績がある[^5] | 中。適用は可能だが、Knucklebonesの持つ「確率ノードを明示的に使える」という構造情報を活用しない分、探索ベース手法より非効率になりやすい | 中。PPO自体の実装は定番だが、自己対戦特有の不安定性への対処が必要 | 自己対戦特有の課題として、学習が不安定になりやすく、一般のRLよりサンプル効率が悪化しやすいと報告されている。理論的には2人零和ゲームの自己対戦はナッシュ均衡に収束する保証がない[^5] | 大規模不完全情報ゲームでの成功例はあるが[^5]、Knucklebones特化の公開実装は今回の調査では確認できず | 自己対戦の非定常性（相手が学習し続けるため環境が動き続ける）による学習不安定化 |
| **Q学習 / DQN（モデルフリー価値ベース）** | 状態行動価値Q(s,a)を学習する。状態数が少なければテーブル（tabular）で厳密に持てるが、大きい場合はNNで近似する（DQN）[^12] | 中〜高。後述の通りKnucklebonesの状態数は将棋やバックギャモンよりずっと小さいが、厳密なテーブル管理には大きすぎる可能性が高く、DQN（NN近似）が現実的 | 低〜中。3手法の中では最も定番で実装例が豊富 | Tabular Q学習は状態数に比例したメモリが必要で大規模盤面には不向きだが、DQNは少パラメータで近似できる[^12] | **Knucklebones専用実装として、MCTS・Q学習・DQNの3手法を比較した公開プロジェクトが存在する**[^9]。ただし定量的な結果（勝率・学習曲線等）はREADMEレベルでは未確認 | 状態表現（何を特徴量にするか）の設計次第で性能が大きく変わる。素朴なtabular実装は状態爆発で破綻しうる（後述） |
| **CFR（Counterfactual Regret Minimization）** | 不完全情報ゲームでのナッシュ均衡近似解法。ポーカー等の代表的手法[^8] | **低い（本質的に不要）**。CFRの強みは「相手の手札等、見えない情報をどう扱うか」であり、Knucklebonesは相手の盤面が常に完全に見える完全情報ゲームなので、CFRが解決する問題がそもそも発生しない[^8] | 該当性が低いため評価対象外 | 該当性が低いため評価対象外 | ポーカー等の不完全情報ゲームでの実績は豊富だが[^8]、完全情報ゲームへの適用事例は本調査では確認できず | 完全情報ゲームに無理に適用すると、不要な複雑さ（情報集合の管理等）を持ち込むだけになる可能性が高い |

## 詳細

### Knucklebonesの状態空間の規模（自己算出・出典なし）

比較表の「相性」判断の前提として、状態数を概算した（外部情報源に基づく値ではなく、ゲームルールからの組合せ計算）。

- 1列（最大3マス）に入りうるダイスの組み合わせは、目1〜6の重複組合せで `0個・1個・2個・3個` の場合の数をすべて足すと `1 + 6 + 21 + 56 = 84` 通り。
- 1つのボード（3列）では `84^3 ≈ 59万` 通り。
- 自分のボードと相手のボードの組み合わせでは `59万 × 59万 ≈ 3,500億` 通り。

これはバックギャモンの約10^20状態[^1]よりずっと小さいが、将棋やチェスの定番である「厳密なテーブル（tabular）で状態ごとに値を持つ」には大きすぎる規模と考えられる。列の並び替え対称性（3列は交換可能）を使えば数分の1に減らせるが、桁数はほぼ変わらない。この規模感が、比較表で「純粋なtabular Q学習は現実的でない」「NNによる関数近似またはExpectimax系の都度探索が現実的」と判断した根拠になっている。

### Knucklebones専用の既存実装（参考実装）

深さより広さを優先する調査方針のもと、「ゼロから作る前に見ておくべき先行実装」として3件見つかった。

- [PhoenixSmaug/Knucklebones-AI](https://github.com/PhoenixSmaug/Knucklebones-AI): MCTS・Q学習・DQNの3手法を実装[^9]。具体的な学習結果やアーキテクチャの詳細はREADME上では確認できなかった（未確認）。
- [AndreVallestero/knucklebones-solver](https://github.com/AndreVallestero/knucklebones-solver): ミニマックス探索にダイス出目の期待値重み付け（mean-weighting）を組み合わせたJavaScript実装。探索深さ2〜6を比較し、深さ5の設定で素朴な比較対象（median-based、出目の中央値のみを見る方式）に対し100戦49勝と、ほぼ互角の結果を報告している[^10]。alpha-beta枝刈りやメモ化は未実装で、今後の改善点として挙げられている。
- [CodingMentalModels/knucklebones-solver](https://github.com/CodingMentalModels/knucklebones-solver): 深さ4のヒューリスティックミニマックス。開発者自身が「倍化・3倍化のシナジーを過小評価する」「相殺による盤面変化を過大/過小評価する」という評価関数の既知の偏りを認めている[^11]。

いずれも学習（自己対戦によるNN獲得）ではなく探索寄りの実装であり、「まず動くベースラインが欲しい」「学習エージェントの対戦相手が欲しい」という場面での参考価値が高い。

### 近縁ゲームでの手法比較（Descent vs Expectimax vs AlphaZero系）

`EinStein würfelt nicht!`（確率×完全情報の抽象戦略ゲーム、Knucklebonesと同じ分類）を対象に、Expectimax・AlphaZero系実装（Polygames）・独自の`Descent`探索フレームワークを比較した論文が見つかった。この論文では、確率ノードに対応させた`Descent`探索の拡張が両者を上回ったと報告されている[^6]。1事例のみであり一般化はできないが、「小〜中規模の確率×完全情報ゲームでは、重厚な自己対戦深層RLより探索ベース手法が優位になりうる」という具体的な反証（AlphaZero系が常に最善とは限らない）として記録しておく。

## 矛盾・未解決

- AndreVallestero実装の「深さ5で49/100勝」という結果は、比較対象（median-based方式）自体の強さが不明なため、mean-weighting方式がどれだけ優れているかの評価が難しい（ほぼ互角、という以上の解釈は避ける）[^10]。
- TD学習をKnucklebonesに適用した公開事例は本調査では見つからなかった（未確認）。バックギャモンとの構造的類似性からの類推であり、Knucklebonesでの実証ではない。
- PPO/Actor-Critic系をKnucklebones（またはごく近い小規模ゲーム）に適用した事例は本調査では見つからなかった（未確認）。

## 限界

- 「広く浅く」の方針のため、各手法1〜2件のソースしか確認していない。特にAlphaZero/MuZero系の確率ノード拡張（NDMZ・Stochastic MuZero）は原論文の要旨レベルの確認にとどまり、実装詳細までは踏み込んでいない。
- 日本語・英語の情報源のみを対象とし、検索は本セッション内の1回限り（light、約10クエリ）。
- 定量的な性能比較（勝率・学習曲線など）はKnucklebones特化の実装では十分に確認できず、多くが「未確認」として記録されている。

## 引用

- [^1]: [TD-Gammon - Wikipedia](https://en.wikipedia.org/wiki/TD-Gammon) / [Temporal Difference Learning and TD-Gammon (Tesauro)](https://www.csd.uwo.ca/~xling/cs346a/extra/tdgammon.pdf) — バックギャモンの状態数約10^20、TD(λ)による自己対戦学習、1993年時点で150万局の自己対戦でトップ級に近い強さに到達
- [^2]: [PLANNING IN STOCHASTIC ENVIRONMENTS (Stochastic MuZero, OpenReview)](https://openreview.net/pdf?id=X6D9bAHhBQ1) — 決定ノードにPUCT、確率ノードに事前分布サンプリングを使う拡張
- [^3]: [Expectimax Search Algorithm | Baeldung on Computer Science](https://www.baeldung.com/cs/expectimax-search) — 確率ノードでは子ノードの評価値を発生確率で重み付き平均する
- [^4]: [Monte Carlo *-Minimax Search (Lanctot et al., IJCAI 2013)](https://www.ijcai.org/Proceedings/13/Papers/093.pdf) — Star1/Star2/Star2.5によるExpectimaxの高速化
- [^5]: [Reinforcement Learning via Self-Play - EmergentMind](https://www.emergentmind.com/topics/reinforcement-learning-via-self-play-rlsp) — 自己対戦は不完全情報ゲームで特に不安定・サンプル非効率になりやすく、2人零和ゲームでもナッシュ均衡への収束保証はない
- [^6]: [Learning to Play Stochastic Two-player Perfect-Information Games without Knowledge (arXiv:2302.04318)](https://arxiv.org/abs/2302.04318) — `EinStein würfelt nicht!`でDescent系拡張がExpectimax・Polygames(AlphaZero系)を上回ったと報告
- [^7]: [PLAYING NONDETERMINISTIC GAMES (NDMZ, OpenReview)](https://openreview.net/pdf?id=QnzSSoqmAvB) — 確率を「もう1人のプレイヤー」として木に組み込む拡張
- [^8]: [Counterfactual Regret Minimization (CFR) - EmergentMind](https://www.emergentmind.com/topics/counterfactual-regret-minimization-cfr) — CFRは不完全情報ゲーム向けの手法であり、完全情報ゲームへの適用はスコープ外
- [^9]: [GitHub - PhoenixSmaug/Knucklebones-AI](https://github.com/PhoenixSmaug/Knucklebones-AI) — Knucklebones専用にMCTS・Q学習・DQNを実装
- [^10]: [GitHub - AndreVallestero/knucklebones-solver](https://github.com/AndreVallestero/knucklebones-solver) — ミニマックス+出目の期待値重み付け、深さ2〜6の比較、深さ5で対抗手法に100戦49勝
- [^11]: [GitHub - CodingMentalModels/knucklebones-solver](https://github.com/CodingMentalModels/knucklebones-solver) — 深さ4のヒューリスティックミニマックス、評価関数の既知の偏りを開発者自身が明記
- [^12]: [Tabular RL Methods: Q-Learning from First Principles - Medium](https://medium.com/@812jugalgajjar/tabular-rl-methods-q-learning-from-first-principles-9d7810db8d1b) — tabular Q学習は状態数に比例したメモリを要し、大規模な状態空間ではNNによる関数近似（DQN）が必要になる（二次情報・一般的なCS知識の確認用途）

## メタ情報

- 調査日: 2026-09-07
- 深さ: light
- 検索クエリ履歴: `AlphaZero MuZero stochastic games chance nodes MCTS dice` / `expectiminimax MCTS stochastic game chance node implementation` / `TD-Gammon backgammon temporal difference reinforcement learning paper` / `self-play PPO actor-critic board game small reinforcement learning` / `Knucklebones AI bot solver reinforcement learning implementation github` / `counterfactual regret minimization CFR perfect information game necessary or not` / `tabular Q-learning small state space board game vs deep function approximation` / (WebFetch: PhoenixSmaug/Knucklebones-AI, AndreVallestero/knucklebones-solver, CodingMentalModels/knucklebones-solver, arXiv:2302.04318)
- 棄却した情報源: なし（今回の検索範囲内では明確なSEOスパム・利益相反記事は検出されなかった）
