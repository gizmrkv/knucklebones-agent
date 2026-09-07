// Knucklebonesのゲームルール実装。
// src/knucklebones/core.py(Python版)と型・関数名を対応させている。

export const NUM_COLUMNS = 3;
export const COLUMN_CAPACITY = 3;
export const DIE_FACES = 6;

// 列内の並び順は合法手判定・破壊・スコア計算のいずれにも影響しないため、
// 列は「出目1..6それぞれの個数」に正規化して持つ(index i は出目 i+1 の個数)。
export type ColumnCounts = readonly number[];
export type BoardState = readonly ColumnCounts[];

export interface GameState {
  readonly boards: readonly [BoardState, BoardState];
  readonly toMove: 0 | 1;
}

const EMPTY_COLUMN: ColumnCounts = Array(DIE_FACES).fill(0);

export function initialState(firstPlayer: 0 | 1 = 0): GameState {
  const emptyBoard: BoardState = Array.from({ length: NUM_COLUMNS }, () => EMPTY_COLUMN);
  return { boards: [emptyBoard, emptyBoard], toMove: firstPlayer };
}

export function columnSize(column: ColumnCounts): number {
  return column.reduce((sum, count) => sum + count, 0);
}

export function boardSize(board: BoardState): number {
  return board.reduce((sum, column) => sum + columnSize(column), 0);
}

export function isFull(board: BoardState): boolean {
  return boardSize(board) === NUM_COLUMNS * COLUMN_CAPACITY;
}

export function legalColumns(board: BoardState): number[] {
  const columns: number[] = [];
  board.forEach((column, index) => {
    if (columnSize(column) < COLUMN_CAPACITY) columns.push(index);
  });
  return columns;
}

export function place(column: ColumnCounts, value: number): ColumnCounts {
  if (columnSize(column) >= COLUMN_CAPACITY) {
    throw new Error(`cannot place die into a full column (value=${value})`);
  }
  const index = value - 1;
  const next = column.slice();
  next[index] += 1;
  return next;
}

export function destroyValue(column: ColumnCounts, value: number): ColumnCounts {
  const index = value - 1;
  if (column[index] === 0) return column;
  const next = column.slice();
  next[index] = 0;
  return next;
}

export function columnScore(column: ColumnCounts): number {
  return column.reduce((sum, count, i) => sum + (i + 1) * count * count, 0);
}

export function boardScore(board: BoardState): number {
  return board.reduce((sum, column) => sum + columnScore(column), 0);
}

function setColumn(board: BoardState, index: number, newColumn: ColumnCounts): BoardState {
  const next = board.slice();
  next[index] = newColumn;
  return next;
}

export interface MoveResult {
  readonly state: GameState;
  readonly gameOver: boolean;
}

/**
 * `value`を`columnIndex`に配置し、相手の対応列を破壊してから手番を進める。
 *
 * 終局判定は、今placeした側(mover)の盤面が9マス埋まったかどうかだけを見れば
 * 十分。この呼び出しの中でdestroyの対象になるのは常に相手側の盤面であり、
 * mover自身の盤面はplace分の+1でしか変化しない。ただし盤面サイズはゲーム
 * 全体を通して単調ではない(自分の盤面は後の相手の手番で破壊されて減る
 * ことがある)ため、総手数に固定の上限はない。
 */
export function applyMove(state: GameState, columnIndex: number, value: number): MoveResult {
  const mover = state.toMove;
  const opponent = (1 - mover) as 0 | 1;

  const placedColumn = place(state.boards[mover][columnIndex], value);
  const updatedMoverBoard = setColumn(state.boards[mover], columnIndex, placedColumn);

  const destroyedColumn = destroyValue(state.boards[opponent][columnIndex], value);
  const updatedOpponentBoard = setColumn(state.boards[opponent], columnIndex, destroyedColumn);

  const boards: [BoardState, BoardState] =
    mover === 0 ? [updatedMoverBoard, updatedOpponentBoard] : [updatedOpponentBoard, updatedMoverBoard];

  const gameOver = isFull(updatedMoverBoard);
  return { state: { boards, toMove: opponent }, gameOver };
}

export function winner(state: GameState): 0 | 1 | null {
  const score0 = boardScore(state.boards[0]);
  const score1 = boardScore(state.boards[1]);
  if (score0 === score1) return null;
  return score0 > score1 ? 0 : 1;
}
