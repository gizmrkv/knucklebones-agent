// 対戦相手として選べるエージェントの一覧。
// 新しいアルゴリズムを追加する場合は、対応するAgent実装ファイルを追加した上で
// この配列に1エントリ追加するだけでよい(main.ts/render.tsの変更は不要)。

import { ExpectimaxAgent } from "./expectimax";
import { RandomAgent } from "./random";
import type { Agent, AgentOption } from "./types";

export const AGENT_OPTIONS: readonly AgentOption[] = [
  { id: "random", label: "ランダム", create: () => new RandomAgent() },
  { id: "expectimax-2", label: "Expectimax(弱)", create: () => new ExpectimaxAgent(2) },
  { id: "expectimax-4", label: "Expectimax(標準)", create: () => new ExpectimaxAgent(4) },
  { id: "expectimax-6", label: "Expectimax(強)", create: () => new ExpectimaxAgent(6) },
];

export const DEFAULT_AGENT_ID = "expectimax-4";

export function createAgent(id: string): Agent {
  const option = AGENT_OPTIONS.find((o) => o.id === id);
  if (!option) {
    throw new Error(`unknown agent id: ${id}`);
  }
  return option.create();
}
