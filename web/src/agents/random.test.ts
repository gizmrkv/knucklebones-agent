import { describe, expect, it } from "vitest";
import type { BoardState, ColumnCounts, GameState } from "../game";
import { legalColumns } from "../game";
import { RandomAgent } from "./random";

function columnFromValues(values: number[]): ColumnCounts {
  const counts = Array(6).fill(0);
  for (const value of values) counts[value - 1] += 1;
  return counts;
}

function boardFromColumns(columns: number[][]): BoardState {
  return columns.map(columnFromValues);
}

describe("RandomAgent", () => {
  it("always returns a legal column", () => {
    const board = boardFromColumns([[1, 1, 1], [2], []]);
    const opponentBoard = boardFromColumns([[], [], []]);
    const state: GameState = { boards: [board, opponentBoard], toMove: 0 };
    const agent = new RandomAgent(() => 0.999999);

    const column = agent.chooseColumn(state, 3);
    expect(legalColumns(board)).toContain(column);
  });

  it("throws when no legal column remains", () => {
    const fullBoard = boardFromColumns([
      [1, 1, 1],
      [2, 2, 2],
      [3, 3, 3],
    ]);
    const opponentBoard = boardFromColumns([[], [], []]);
    const state: GameState = { boards: [fullBoard, opponentBoard], toMove: 0 };
    const agent = new RandomAgent();

    expect(() => agent.chooseColumn(state, 4)).toThrow();
  });
});
