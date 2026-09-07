// tests/test_core.py(Python版)の代表ケースを移植したロジックテスト。
// 移植ミス(特にPython実装フェーズで実際に踏んだ、破壊による盤面サイズの
// 非単調性の見落とし)を防ぐための最低限の保険。

import { describe, expect, it } from "vitest";
import {
  DIE_FACES,
  applyMove,
  boardScore,
  columnScore,
  destroyValue,
  isFull,
  legalColumns,
  place,
  winner,
} from "./game";
import type { BoardState, ColumnCounts, GameState } from "./game";

function columnFromValues(values: number[]): ColumnCounts {
  const counts = Array(DIE_FACES).fill(0);
  for (const value of values) counts[value - 1] += 1;
  return counts;
}

function boardFromColumns(columns: number[][]): BoardState {
  return columns.map(columnFromValues);
}

describe("columnScore", () => {
  it("matches the docs/RULES.md example (4,1,4 -> 17)", () => {
    expect(columnScore(columnFromValues([4, 1, 4]))).toBe(17);
  });

  it("is zero for an empty column", () => {
    expect(columnScore(columnFromValues([]))).toBe(0);
  });

  it("is value*4 for a double", () => {
    expect(columnScore(columnFromValues([5, 5]))).toBe(5 * 4);
  });

  it("is value*9 for a triple", () => {
    expect(columnScore(columnFromValues([2, 2, 2]))).toBe(2 * 9);
  });
});

describe("legalColumns", () => {
  it("excludes full columns", () => {
    const board = boardFromColumns([[1, 1, 1], [2], []]);
    expect(legalColumns(board)).toEqual([1, 2]);
  });
});

describe("place", () => {
  it("throws when the column is already full", () => {
    const full = columnFromValues([3, 3, 3]);
    expect(() => place(full, 4)).toThrow();
  });
});

describe("destroyValue", () => {
  it("removes only the matching value", () => {
    const column = columnFromValues([4, 1, 4]);
    expect(destroyValue(column, 4)).toEqual(columnFromValues([1]));
  });

  it("is a no-op when the value is absent", () => {
    const column = columnFromValues([1, 2]);
    expect(destroyValue(column, 5)).toEqual(column);
  });
});

describe("applyMove", () => {
  it("destroys only the opponent's matching column", () => {
    let state: GameState = { boards: [boardFromColumns([[], [], []]), boardFromColumns([[], [], []])], toMove: 0 };
    state = applyMove(state, 0, 5).state; // player0: col0=[5]
    state = applyMove(state, 0, 3).state; // player1: col0=[3]
    state = applyMove(state, 1, 5).state; // player0: col1=[5]
    state = applyMove(state, 0, 5).state; // player1が列0に5 -> player0の列0(5)が破壊

    expect(state.boards[0][0]).toEqual(columnFromValues([]));
    expect(state.boards[0][1]).toEqual(columnFromValues([5]));
    expect(state.boards[1][0]).toEqual(columnFromValues([3, 5]));
  });

  it("ends the game exactly when the mover's board becomes full", () => {
    const almostFull = boardFromColumns([
      [1, 1, 1],
      [1, 1, 1],
      [1, 1],
    ]);
    const empty = boardFromColumns([[], [], []]);
    const state: GameState = { boards: [almostFull, empty], toMove: 0 };
    expect(isFull(state.boards[0])).toBe(false);

    const result = applyMove(state, 2, 1);
    expect(result.gameOver).toBe(true);
    expect(isFull(result.state.boards[0])).toBe(true);
  });

  it("does not end the game when only the opponent's board shrinks", () => {
    let state: GameState = { boards: [boardFromColumns([[], [], []]), boardFromColumns([[], [], []])], toMove: 0 };
    let result = applyMove(state, 0, 6); // player0
    expect(result.gameOver).toBe(false);
    state = result.state;

    result = applyMove(state, 0, 6); // player1が同じ値を置く -> player0の列0(6)が破壊
    expect(result.gameOver).toBe(false);
    expect(result.state.boards[0][0]).toEqual(columnFromValues([]));
  });
});

describe("winner", () => {
  it("is null on a tie", () => {
    const state: GameState = {
      boards: [boardFromColumns([[3], [], []]), boardFromColumns([[], [3], []])],
      toMove: 0,
    };
    expect(boardScore(state.boards[0])).toBe(boardScore(state.boards[1]));
    expect(winner(state)).toBeNull();
  });

  it("picks the higher score", () => {
    let state: GameState = { boards: [boardFromColumns([[], [], []]), boardFromColumns([[], [], []])], toMove: 0 };
    state = applyMove(state, 0, 6).state;
    state = applyMove(state, 0, 1).state;
    expect(winner(state)).toBe(0);
  });
});
