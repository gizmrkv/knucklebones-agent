import { COLUMN_CAPACITY, boardScore, legalColumns } from "./game";
import type { BoardState, GameState } from "./game";

export interface RenderProps {
  game: GameState;
  rolledValue: number;
  gameOver: boolean;
  message: string;
  humanPlayer: 0 | 1;
  onColumnClick: (columnIndex: number) => void;
  onRestart: () => void;
}

function renderBoard(board: BoardState, clickableColumns: number[], onColumnClick?: (i: number) => void): HTMLElement {
  const boardEl = document.createElement("div");
  boardEl.className = "board";

  board.forEach((column, columnIndex) => {
    const columnEl = document.createElement("div");
    columnEl.className = "column";

    const isClickable = clickableColumns.includes(columnIndex);
    if (isClickable) {
      columnEl.classList.add("clickable");
      columnEl.addEventListener("click", () => onColumnClick?.(columnIndex));
    }

    // 内部状態は「値ごとの個数」のみで並び順を持たないため、
    // 表示上は出目の小さい順に並べる(見た目の安定した表示のため)
    const dice: number[] = [];
    column.forEach((count, i) => {
      for (let k = 0; k < count; k++) dice.push(i + 1);
    });

    for (let row = 0; row < COLUMN_CAPACITY; row++) {
      const cellEl = document.createElement("div");
      cellEl.className = "cell";
      const value = dice[row];
      if (value !== undefined) {
        cellEl.textContent = String(value);
        cellEl.classList.add("filled");
      }
      columnEl.appendChild(cellEl);
    }

    boardEl.appendChild(columnEl);
  });

  return boardEl;
}

export function renderApp(props: RenderProps): void {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) throw new Error("#app element not found");
  app.innerHTML = "";

  const container = document.createElement("div");
  container.className = "container";

  const title = document.createElement("h1");
  title.textContent = "Knucklebones";
  container.appendChild(title);

  const status = document.createElement("p");
  status.className = "status";
  status.textContent = props.gameOver
    ? props.message
    : `${props.message}(出目: ${props.rolledValue})`;
  container.appendChild(status);

  const boardsRow = document.createElement("div");
  boardsRow.className = "boards-row";

  const aiPlayer = props.humanPlayer === 0 ? 1 : 0;
  const humanClickableColumns =
    !props.gameOver && props.game.toMove === props.humanPlayer
      ? legalColumns(props.game.boards[props.humanPlayer])
      : [];

  const humanSection = document.createElement("div");
  humanSection.className = "player-section";
  const humanLabel = document.createElement("h2");
  humanLabel.textContent = `あなた: ${boardScore(props.game.boards[props.humanPlayer])}点`;
  humanSection.appendChild(humanLabel);
  humanSection.appendChild(
    renderBoard(props.game.boards[props.humanPlayer], humanClickableColumns, props.onColumnClick),
  );
  boardsRow.appendChild(humanSection);

  const aiSection = document.createElement("div");
  aiSection.className = "player-section";
  const aiLabel = document.createElement("h2");
  aiLabel.textContent = `AI: ${boardScore(props.game.boards[aiPlayer])}点`;
  aiSection.appendChild(aiLabel);
  aiSection.appendChild(renderBoard(props.game.boards[aiPlayer], []));
  boardsRow.appendChild(aiSection);

  container.appendChild(boardsRow);

  const restartButton = document.createElement("button");
  restartButton.textContent = "もう一度遊ぶ";
  restartButton.className = "restart-button";
  restartButton.addEventListener("click", props.onRestart);
  container.appendChild(restartButton);

  app.appendChild(container);
}
