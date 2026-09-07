import "./style.css";
import { DIE_FACES, applyMove, initialState, legalColumns, winner } from "./game";
import type { GameState } from "./game";
import { AGENT_OPTIONS, DEFAULT_AGENT_ID, createAgent } from "./agents/registry";
import { ExpectimaxAgent } from "./agents/expectimax";
import type { Agent } from "./agents/types";
import { renderApp } from "./render";

const HUMAN = 0 as const;
const AI = 1 as const;
const AI_MOVE_DELAY_MS = 500;
// 手番のおすすめ表示に使う探索エージェント。対戦相手の強さ設定とは独立に、
// 常に一定の強さで「良い手」の参考値を示す。
const HINT_AGENT = new ExpectimaxAgent(4);

interface UiState {
  game: GameState;
  rolledValue: number;
  gameOver: boolean;
  message: string;
}

let opponentId = DEFAULT_AGENT_ID;
let opponent: Agent = createAgent(opponentId);
let showHint = true;

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
  const columnIndex = opponent.chooseColumn(ui.game, ui.rolledValue);
  advance(columnIndex);
}

function restart(): void {
  ui = newGame();
  render();
  if (ui.game.toMove === AI) {
    window.setTimeout(playAiTurn, AI_MOVE_DELAY_MS);
  }
}

function handleOpponentChange(id: string): void {
  opponentId = id;
  opponent = createAgent(id);
  restart();
}

function handleHintToggle(checked: boolean): void {
  showHint = checked;
  render();
}

function render(): void {
  const isHumanTurn = !ui.gameOver && ui.game.toMove === HUMAN;
  const suggestedColumn =
    showHint && isHumanTurn ? HINT_AGENT.chooseColumn(ui.game, ui.rolledValue) : null;

  renderApp({
    game: ui.game,
    rolledValue: ui.rolledValue,
    gameOver: ui.gameOver,
    message: ui.message,
    humanPlayer: HUMAN,
    onColumnClick: handleColumnClick,
    onRestart: restart,
    opponentOptions: AGENT_OPTIONS,
    selectedOpponentId: opponentId,
    onOpponentChange: handleOpponentChange,
    showHint,
    onHintToggle: handleHintToggle,
    suggestedColumn,
  });
}

render();
if (ui.game.toMove === AI) {
  window.setTimeout(playAiTurn, AI_MOVE_DELAY_MS);
}
