import type { GameState } from "../game";

// エージェントの共通インターフェース。src/knucklebones/agents/base.pyのAgent Protocolに対応。
export interface Agent {
  chooseColumn(state: GameState, rolledValue: number): number;
}

// UIの選択肢一覧(セレクトボックス等)に表示するための1エントリ。
// 新しいアルゴリズムを追加する場合はこの形のオブジェクトをregistry.tsに
// 1つ足すだけでよく、main.ts/render.ts側の変更は不要。
export interface AgentOption {
  id: string;
  label: string;
  create: () => Agent;
}
