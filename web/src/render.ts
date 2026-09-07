import { COLUMN_CAPACITY, boardScore, columnScore, legalColumns } from "./game";
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

/**
 * 盤面を描画する。`growFromBottom`がtrueだと自分の盤面のように下から上へ、
 * falseだと相手の盤面のように上から下へダイスが積まれて見えるようにする
 * (画面上は常に上から3行分を描画するが、値を敷き詰める向きだけを変える)。
 */
function renderBoard(
  board: BoardState,
  clickableColumns: number[],
  growFromBottom: boolean,
  onColumnClick?: (i: number) => void,
): HTMLElement {
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
    const padding: undefined[] = Array(COLUMN_CAPACITY - dice.length).fill(undefined);
    const rows = growFromBottom ? [...padding, ...dice] : [...dice, ...padding];

    for (const value of rows) {
      const cellEl = document.createElement("div");
      cellEl.className = "cell";
      if (value !== undefined) {
        cellEl.textContent = String(value);
        cellEl.classList.add("filled");
        const sameValueCount = column[value - 1];
        if (sameValueCount === 2) cellEl.classList.add("double");
        if (sameValueCount === 3) cellEl.classList.add("triple");
      }
      columnEl.appendChild(cellEl);
    }

    boardEl.appendChild(columnEl);
  });

  return boardEl;
}

function renderColumnScores(board: BoardState): HTMLElement {
  const rowEl = document.createElement("div");
  rowEl.className = "column-scores";
  board.forEach((column) => {
    const cellEl = document.createElement("div");
    cellEl.className = "column-score";
    cellEl.textContent = String(columnScore(column));
    rowEl.appendChild(cellEl);
  });
  return rowEl;
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

  const aiPlayer = props.humanPlayer === 0 ? 1 : 0;
  const humanClickableColumns =
    !props.gameOver && props.game.toMove === props.humanPlayer
      ? legalColumns(props.game.boards[props.humanPlayer])
      : [];

  // 相手を上、自分を下に配置する。相手の盤面は上から下へ、自分の盤面は
  // 下から上へダイスが積まれて見えるようにし、中央に近い側で列同士が
  // 対応して見えるようにする。
  const aiSection = document.createElement("div");
  aiSection.className = "player-section";
  const aiLabel = document.createElement("h2");
  aiLabel.textContent = `AI: ${boardScore(props.game.boards[aiPlayer])}点`;
  aiSection.appendChild(aiLabel);
  aiSection.appendChild(renderBoard(props.game.boards[aiPlayer], [], false));
  aiSection.appendChild(renderColumnScores(props.game.boards[aiPlayer]));
  container.appendChild(aiSection);

  const status = document.createElement("p");
  status.className = "status";
  status.textContent = props.gameOver ? props.message : `${props.message}(出目: ${props.rolledValue})`;
  container.appendChild(status);

  const humanSection = document.createElement("div");
  humanSection.className = "player-section";
  humanSection.appendChild(renderColumnScores(props.game.boards[props.humanPlayer]));
  humanSection.appendChild(
    renderBoard(props.game.boards[props.humanPlayer], humanClickableColumns, true, props.onColumnClick),
  );
  const humanLabel = document.createElement("h2");
  humanLabel.textContent = `あなた: ${boardScore(props.game.boards[props.humanPlayer])}点`;
  humanSection.appendChild(humanLabel);
  container.appendChild(humanSection);

  const restartButton = document.createElement("button");
  restartButton.textContent = "もう一度遊ぶ";
  restartButton.className = "restart-button";
  restartButton.addEventListener("click", props.onRestart);
  container.appendChild(restartButton);

  app.appendChild(container);
}
