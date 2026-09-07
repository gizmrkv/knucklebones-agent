// 合法な列から一様ランダムに選ぶベースラインエージェント。
// src/knucklebones/agents/random_agent.pyの移植。

import { legalColumns } from "../game";
import type { GameState } from "../game";
import type { Agent } from "./types";

export class RandomAgent implements Agent {
  private readonly rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  chooseColumn(state: GameState, _rolledValue: number): number {
    const columns = legalColumns(state.boards[state.toMove]);
    if (columns.length === 0) {
      throw new Error("no legal column to place a die into");
    }
    const index = Math.floor(this.rng() * columns.length);
    return columns[index];
  }
}
