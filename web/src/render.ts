import { COLUMN_CAPACITY, boardScore, columnScore, legalColumns } from "./game";
import type { BoardState, GameState } from "./game";
import type { AgentOption } from "./agents/types";

export interface RenderProps {
  game: GameState;
  rolledValue: number;
  gameOver: boolean;
  message: string;
  humanPlayer: 0 | 1;
  onColumnClick: (columnIndex: number) => void;
  onRestart: () => void;
  agentOptions: readonly AgentOption[];
  selectedOpponentId: string;
  onOpponentChange: (id: string) => void;
  selectedHintAgentId: string;
  onHintAgentChange: (id: string) => void;
  showHint: boolean;
  onHintToggle: (checked: boolean) => void;
  suggestedColumn: number | null;
}

/**
 * 盤面を描画する。`growFromBottom`がtrueだと下段から、falseだと上段から
 * ダイスを詰めていく(画面上は常に上から3行分を描画するが、値を敷き詰める
 * 向きだけを変える)。どちらを自分/相手に割り当てるかは呼び出し側で決める。
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

function renderHintRow(suggestedColumn: number | null): HTMLElement {
  const rowEl = document.createElement("div");
  rowEl.className = "hint-row";
  for (let columnIndex = 0; columnIndex < COLUMN_CAPACITY; columnIndex++) {
    const cellEl = document.createElement("div");
    cellEl.className = "hint-marker";
    if (columnIndex === suggestedColumn) {
      cellEl.textContent = "▼";
      cellEl.classList.add("active");
    }
    rowEl.appendChild(cellEl);
  }
  return rowEl;
}

function renderAgentSelect(
  labelText: string,
  options: readonly AgentOption[],
  selectedId: string,
  onChange: (id: string) => void,
): HTMLElement {
  const label = document.createElement("label");
  label.textContent = `${labelText}: `;
  const select = document.createElement("select");
  for (const option of options) {
    const optionEl = document.createElement("option");
    optionEl.value = option.id;
    optionEl.textContent = option.label;
    optionEl.selected = option.id === selectedId;
    select.appendChild(optionEl);
  }
  select.addEventListener("change", () => onChange(select.value));
  label.appendChild(select);
  return label;
}

function renderControls(props: RenderProps): HTMLElement {
  const controlsEl = document.createElement("div");
  controlsEl.className = "controls";

  controlsEl.appendChild(
    renderAgentSelect("対戦相手", props.agentOptions, props.selectedOpponentId, props.onOpponentChange),
  );
  controlsEl.appendChild(
    renderAgentSelect("ヒントAI", props.agentOptions, props.selectedHintAgentId, props.onHintAgentChange),
  );

  const hintLabel = document.createElement("label");
  const hintCheckbox = document.createElement("input");
  hintCheckbox.type = "checkbox";
  hintCheckbox.checked = props.showHint;
  hintCheckbox.addEventListener("change", () => props.onHintToggle(hintCheckbox.checked));
  hintLabel.appendChild(hintCheckbox);
  hintLabel.append(" おすすめの列を表示");
  controlsEl.appendChild(hintLabel);

  return controlsEl;
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

  container.appendChild(renderControls(props));

  const aiPlayer = props.humanPlayer === 0 ? 1 : 0;
  const isHumanTurn = !props.gameOver && props.game.toMove === props.humanPlayer;
  const humanClickableColumns = isHumanTurn ? legalColumns(props.game.boards[props.humanPlayer]) : [];
  const suggestedColumn = isHumanTurn ? props.suggestedColumn : null;

  // 相手を上、自分を下に配置する。自分の盤面は上方向へ、相手の盤面は
  // 下方向へダイスが積まれて見えるようにする。
  const aiSection = document.createElement("div");
  aiSection.className = "player-section";
  const aiLabel = document.createElement("h2");
  aiLabel.textContent = `AI: ${boardScore(props.game.boards[aiPlayer])}点`;
  aiSection.appendChild(aiLabel);
  aiSection.appendChild(renderBoard(props.game.boards[aiPlayer], [], true));
  aiSection.appendChild(renderColumnScores(props.game.boards[aiPlayer]));
  container.appendChild(aiSection);

  const status = document.createElement("p");
  status.className = "status";
  status.textContent = props.gameOver ? props.message : `${props.message}(出目: ${props.rolledValue})`;
  container.appendChild(status);

  const humanSection = document.createElement("div");
  humanSection.className = "player-section";
  humanSection.appendChild(renderColumnScores(props.game.boards[props.humanPlayer]));
  humanSection.appendChild(renderHintRow(suggestedColumn));
  humanSection.appendChild(
    renderBoard(props.game.boards[props.humanPlayer], humanClickableColumns, false, props.onColumnClick),
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
