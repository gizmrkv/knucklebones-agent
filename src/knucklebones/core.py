"""Knucklebonesのゲームルール実装(純粋関数のみ)。"""

from __future__ import annotations

from dataclasses import dataclass

NUM_PLAYERS = 2
NUM_COLUMNS = 3
COLUMN_CAPACITY = 3
DIE_FACES = 6

# 列内の並び順は合法手判定・破壊・スコア計算のいずれにも影響しないため、
# 列は「出目1..6それぞれの個数」に正規化して持つ(index i は出目 i+1 の個数)。
ColumnCounts = tuple[int, ...]
BoardState = tuple[ColumnCounts, ...]

EMPTY_COLUMN: ColumnCounts = tuple(0 for _ in range(DIE_FACES))


@dataclass(frozen=True)
class GameState:
    boards: tuple[BoardState, BoardState]
    to_move: int


def initial_state(first_player: int = 0) -> GameState:
    empty_board: BoardState = tuple(EMPTY_COLUMN for _ in range(NUM_COLUMNS))
    return GameState(boards=(empty_board, empty_board), to_move=first_player)


def column_size(column: ColumnCounts) -> int:
    return sum(column)


def board_size(board: BoardState) -> int:
    return sum(column_size(column) for column in board)


def is_full(board: BoardState) -> bool:
    return board_size(board) == NUM_COLUMNS * COLUMN_CAPACITY


def legal_columns(board: BoardState) -> tuple[int, ...]:
    return tuple(
        index
        for index, column in enumerate(board)
        if column_size(column) < COLUMN_CAPACITY
    )


def place(column: ColumnCounts, value: int) -> ColumnCounts:
    if column_size(column) >= COLUMN_CAPACITY:
        raise ValueError(f"cannot place die into a full column (value={value})")
    index = value - 1
    return column[:index] + (column[index] + 1,) + column[index + 1 :]


def destroy(column: ColumnCounts, value: int) -> ColumnCounts:
    index = value - 1
    if column[index] == 0:
        return column
    return column[:index] + (0,) + column[index + 1 :]


def column_score(column: ColumnCounts) -> int:
    return sum(value * count**2 for value, count in enumerate(column, start=1))


def board_score(board: BoardState) -> int:
    return sum(column_score(column) for column in board)


def _set_column(board: BoardState, index: int, new_column: ColumnCounts) -> BoardState:
    return board[:index] + (new_column,) + board[index + 1 :]


def apply_move(
    state: GameState, column_index: int, value: int
) -> tuple[GameState, bool]:
    """`value`を`column_index`に配置し、相手の対応列を破壊してから手番を進める。

    戻り値は(次の状態, 終局したか)。終局判定は、今placeした側(mover)の盤面が
    9マス埋まったかどうかだけを見れば十分。この呼び出しの中でdestroyの対象に
    なるのは常に相手側の盤面であり、mover自身の盤面はこの呼び出し内では
    place分の+1でしか変化しない(相手の盤面破壊だけでは終局と誤判定しない)。
    ただし盤面サイズはゲーム全体を通して単調ではない点に注意: 自分の盤面は、
    後の相手の手番で自分の値が破壊されて減ることがあるため、両者の盤面が
    先に埋まるまでの総手数に固定の上限はない(実測では数十手程度で終わる)。
    """
    mover = state.to_move
    opponent = 1 - mover

    placed_column = place(state.boards[mover][column_index], value)
    updated_mover_board = _set_column(state.boards[mover], column_index, placed_column)

    destroyed_column = destroy(state.boards[opponent][column_index], value)
    updated_opponent_board = _set_column(
        state.boards[opponent], column_index, destroyed_column
    )

    if mover == 0:
        boards = (updated_mover_board, updated_opponent_board)
    else:
        boards = (updated_opponent_board, updated_mover_board)

    game_over = is_full(updated_mover_board)
    return GameState(boards=boards, to_move=opponent), game_over


def winner(state: GameState) -> int | None:
    score_0 = board_score(state.boards[0])
    score_1 = board_score(state.boards[1])
    if score_0 == score_1:
        return None
    return 0 if score_0 > score_1 else 1
