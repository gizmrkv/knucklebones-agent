from __future__ import annotations

from knucklebones.agents.expectimax import ExpectimaxAgent
from knucklebones.core import DIE_FACES, BoardState, ColumnCounts, GameState


def _column_from_values(values: list[int]) -> ColumnCounts:
    counts = [0] * DIE_FACES
    for value in values:
        counts[value - 1] += 1
    return tuple(counts)


def _board_from_columns(columns: list[list[int]]) -> BoardState:
    return tuple(_column_from_values(values) for values in columns)


def test_greedy_completes_triple_over_scattering() -> None:
    root_board = _board_from_columns([[6, 6], [], []])
    opponent_board = _board_from_columns([[], [], []])
    state = GameState(boards=(root_board, opponent_board), to_move=0)

    agent = ExpectimaxAgent(depth=1)
    assert agent.choose_column(state, rolled_value=6) == 0


def test_greedy_prefers_destroying_opponents_high_value_column() -> None:
    root_board = _board_from_columns([[], [], []])
    opponent_board = _board_from_columns([[5, 5], [], []])
    state = GameState(boards=(root_board, opponent_board), to_move=0)

    agent = ExpectimaxAgent(depth=1)
    # 列0を選べば自分に5点入ると同時に相手の5x5(=20点)コンボを全消しできる
    assert agent.choose_column(state, rolled_value=5) == 0


def test_choose_column_is_deterministic_given_same_state() -> None:
    root_board = _board_from_columns([[3], [1, 1], []])
    opponent_board = _board_from_columns([[2], [], [4]])
    state = GameState(boards=(root_board, opponent_board), to_move=0)

    agent = ExpectimaxAgent(depth=3)
    first = agent.choose_column(state, rolled_value=4)
    second = agent.choose_column(state, rolled_value=4)
    assert first == second
