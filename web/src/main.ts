import "./style.css";
import { DIE_FACES, applyMove, initialState, legalColumns, winner } from "./game";
import type { GameState } from "./game";
import { ExpectimaxAgent } from "./ai";
import { renderApp } from "./render";

const HUMAN = 0 as const;
const AI = 1 as const;
const AI_DEPTH = 4;
const AI_MOVE_DELAY_MS = 500;

interface UiState {
  game: GameState;
  rolledValue: number;
  gameOver: boolean;
  message: string;
}

const agent = new ExpectimaxAgent(AI_DEPTH);

function rollDie(): number {
  return Math.floor(Math.random() * DIE_FACES) + 1;
}

function turnMessage(state: GameState): string {
  return state.toMove === HUMAN ? "あなたの番です" : "AIの番です";
}

function resultMessage(state: GameState): string {
  const result = winner(state);
  if (result === null) return "引き分けです";
  return result === HUMAN ? "あなたの勝ちです!" : "AIの勝ちです";
}

function newGame(): UiState {
  const firstPlayer = Math.random() < 0.5 ? HUMAN : AI;
  const game = initialState(firstPlayer);
  return {
    game,
    rolledValue: rollDie(),
    gameOver: false,
    message: turnMessage(game),
  };
}

let ui = newGame();

function advance(columnIndex: number): void {
  const { state, gameOver } = applyMove(ui.game, columnIndex, ui.rolledValue);
  ui = {
    game: state,
    rolledValue: rollDie(),
    gameOver,
    message: gameOver ? resultMessage(state) : turnMessage(state),
  };
  render();

  if (!gameOver && state.toMove === AI) {
    window.setTimeout(playAiTurn, AI_MOVE_DELAY_MS);
  }
}

function handleColumnClick(columnIndex: number): void {
  if (ui.gameOver || ui.game.toMove !== HUMAN) return;
  if (!legalColumns(ui.game.boards[HUMAN]).includes(columnIndex)) return;
  advance(columnIndex);
}

function playAiTurn(): void {
  if (ui.gameOver || ui.game.toMove !== AI) return;
  const columnIndex = agent.chooseColumn(ui.game, ui.rolledValue);
  advance(columnIndex);
}

function restart(): void {
  ui = newGame();
  render();
  if (ui.game.toMove === AI) {
    window.setTimeout(playAiTurn, AI_MOVE_DELAY_MS);
  }
}

function render(): void {
  renderApp({
    game: ui.game,
    rolledValue: ui.rolledValue,
    gameOver: ui.gameOver,
    message: ui.message,
    humanPlayer: HUMAN,
    onColumnClick: handleColumnClick,
    onRestart: restart,
  });
}

render();
if (ui.game.toMove === AI) {
  window.setTimeout(playAiTurn, AI_MOVE_DELAY_MS);
}
