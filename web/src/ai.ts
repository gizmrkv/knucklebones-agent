// Expectimax探索によるエージェント(枝刈りなし、メモ化あり)。
// src/knucklebones/agents/expectimax.py(Python版)の移植。
// 評価関数は近似ヒューリスティックを持たず、常に厳密な自分スコア-相手スコアを使う。

import { DIE_FACES, applyMove, boardScore, legalColumns } from "./game";
import type { GameState } from "./game";

function serializeState(state: GameState): string {
  const serializeBoard = (board: GameState["boards"][number]) =>
    board.map((column) => column.join(",")).join(";");
  return `${state.toMove}|${serializeBoard(state.boards[0])}|${serializeBoard(state.boards[1])}`;
}

export class ExpectimaxAgent {
  private readonly depth: number;
  private cache = new Map<string, number>();

  constructor(depth = 4) {
    if (depth < 1) {
      throw new Error(`depth must be at least 1 (depth=${depth})`);
    }
    this.depth = depth;
  }

  chooseColumn(state: GameState, rolledValue: number): number {
    this.cache.clear();
    const rootPlayer = state.toMove;
    const columns = legalColumns(state.boards[rootPlayer]);
    if (columns.length === 0) {
      throw new Error("no legal column to place a die into");
    }

    let bestColumn = columns[0];
    let bestValue = -Infinity;
    for (const column of columns) {
      const { state: nextState, gameOver } = applyMove(state, column, rolledValue);
      const value = this.chanceValue(nextState, this.depth - 1, rootPlayer, gameOver);
      if (value > bestValue) {
        bestValue = value;
        bestColumn = column;
      }
    }
    return bestColumn;
  }

  private evaluate(state: GameState, rootPlayer: 0 | 1): number {
    const opponent = (1 - rootPlayer) as 0 | 1;
    return boardScore(state.boards[rootPlayer]) - boardScore(state.boards[opponent]);
  }

  private chanceValue(
    state: GameState,
    remainingDepth: number,
    rootPlayer: 0 | 1,
    gameOver: boolean,
  ): number {
    if (gameOver || remainingDepth <= 0) {
      return this.evaluate(state, rootPlayer);
    }

    const cacheKey = `${remainingDepth}:${serializeState(state)}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) return cached;

    let total = 0;
    for (let value = 1; value <= DIE_FACES; value++) {
      total += this.decisionValue(state, value, remainingDepth, rootPlayer);
    }
    const result = total / DIE_FACES;
    this.cache.set(cacheKey, result);
    return result;
  }

  private decisionValue(
    state: GameState,
    rolledValue: number,
    remainingDepth: number,
    rootPlayer: 0 | 1,
  ): number {
    const isMaximizing = state.toMove === rootPlayer;
    let bestValue = isMaximizing ? -Infinity : Infinity;
    for (const column of legalColumns(state.boards[state.toMove])) {
      const { state: nextState, gameOver } = applyMove(state, column, rolledValue);
      const value = this.chanceValue(nextState, remainingDepth - 1, rootPlayer, gameOver);
      bestValue = isMaximizing ? Math.max(bestValue, value) : Math.min(bestValue, value);
    }
    return bestValue;
  }
}
