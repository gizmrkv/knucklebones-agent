// @vitest-environment jsdom
//
// 盤面のダイス積み上げ方向は仕様のやり取りが何度か発生した箇所のため、
// 回帰を防ぐための固定テストを置く。renderApp呼び出し後の実際のDOM上の
// セル配置(どの行にダイスが入るか)を検証する。

import { beforeEach, describe, expect, it } from "vitest";
import { AGENT_OPTIONS, DEFAULT_AGENT_ID } from "./agents/registry";
import type { BoardState, ColumnCounts, GameState } from "./game";
import { renderApp } from "./render";

function columnFromValues(values: number[]): ColumnCounts {
  const counts = Array(6).fill(0);
  for (const value of values) counts[value - 1] += 1;
  return counts;
}

function boardFromColumns(columns: number[][]): BoardState {
  return columns.map(columnFromValues);
}

function renderWithSingleDicePerBoard(): void {
  const state: GameState = {
    boards: [
      boardFromColumns([[5], [], []]), // player0 = 自分
      boardFromColumns([[6], [], []]), // player1 = AI
    ],
    toMove: 0,
  };

  renderApp({
    game: state,
    rolledValue: 3,
    gameOver: false,
    message: "test",
    humanPlayer: 0,
    onColumnClick: () => {},
    onRestart: () => {},
    agentOptions: AGENT_OPTIONS,
    selectedOpponentId: DEFAULT_AGENT_ID,
    onOpponentChange: () => {},
    selectedHintAgentId: DEFAULT_AGENT_ID,
    onHintAgentChange: () => {},
    showHint: false,
    onHintToggle: () => {},
    suggestedColumn: null,
  });
}

function firstColumnCellTexts(sectionIndex: 0 | 1): string[] {
  const sections = document.querySelectorAll(".player-section");
  const board = sections[sectionIndex].querySelector(".board");
  if (!board) throw new Error(".board not found");
  const firstColumn = board.querySelectorAll(".column")[0];
  return Array.from(firstColumn.querySelectorAll(".cell")).map((cell) => cell.textContent ?? "");
}

describe("renderApp の積み上げ方向", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it("AI(相手, 画面上側)の盤面は下段から積まれる", () => {
    renderWithSingleDicePerBoard();
    // player-sectionはDOM順でAIが先、自分が後
    const [top, mid, bottom] = firstColumnCellTexts(0);
    expect([top, mid, bottom]).toEqual(["", "", "6"]);
  });

  it("自分(画面下側)の盤面は上段から積まれる", () => {
    renderWithSingleDicePerBoard();
    const [top, mid, bottom] = firstColumnCellTexts(1);
    expect([top, mid, bottom]).toEqual(["5", "", ""]);
  });
});
