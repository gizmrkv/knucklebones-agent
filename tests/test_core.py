from __future__ import annotations

import pytest

from knucklebones.core import (
    DIE_FACES,
    BoardState,
    ColumnCounts,
    GameState,
    apply_move,
    board_score,
    column_score,
    destroy,
    initial_state,
    is_full,
    legal_columns,
    place,
    winner,
)


def _column_from_values(values: list[int]) -> ColumnCounts:
    counts = [0] * DIE_FACES
    for value in values:
        counts[value - 1] += 1
    return tuple(counts)


def _board_from_columns(columns: list[list[int]]) -> BoardState:
    return tuple(_column_from_values(values) for values in columns)


def test_column_score_matches_rules_example() -> None:
    # docs/RULES.md 5節の例: 4,1,4 -> 4*2 + 1*1 + 4*2 = 17
    assert column_score(_column_from_values([4, 1, 4])) == 17


def test_column_score_empty_is_zero() -> None:
    assert column_score(_column_from_values([])) == 0


def test_column_score_double_is_value_times_four() -> None:
    assert column_score(_column_from_values([5, 5])) == 5 * 4


def test_column_score_triple_is_value_times_nine() -> None:
    assert column_score(_column_from_values([2, 2, 2])) == 2 * 9


def test_legal_columns_excludes_full_columns() -> None:
    board = (
        _column_from_values([1, 1, 1]),  # 満杯
        _column_from_values([2]),
        _column_from_values([]),
    )
    assert legal_columns(board) == (1, 2)


def test_place_raises_when_column_is_full() -> None:
    full_column = _column_from_values([3, 3, 3])
    with pytest.raises(ValueError):
        place(full_column, 4)


def test_destroy_removes_only_matching_value() -> None:
    column = _column_from_values([4, 1, 4])
    destroyed = destroy(column, 4)
    assert destroyed == _column_from_values([1])


def test_destroy_is_noop_when_value_absent() -> None:
    column = _column_from_values([1, 2])
    assert destroy(column, 5) == column


def test_apply_move_destroys_opponent_matching_column_only() -> None:
    state = initial_state(first_player=0)
    state, _ = apply_move(state, column_index=0, value=5)  # player0: col0=[5]
    state, _ = apply_move(state, column_index=0, value=3)  # player1: col0=[3]
    state, _ = apply_move(state, column_index=1, value=5)  # player0: col1=[5]
    # player1が列0に5を置く -> player0の列0(5)は破壊されるが列1(5)は無傷
    state, _ = apply_move(state, column_index=0, value=5)

    assert state.boards[0][0] == _column_from_values([])
    assert state.boards[0][1] == _column_from_values([5])
    assert state.boards[1][0] == _column_from_values([3, 5])


def test_apply_move_ends_game_exactly_when_movers_board_becomes_full() -> None:
    # player0の盤面をあと1マスで満杯という状態に直接組み立てる
    almost_full_board = (
        _column_from_values([1, 1, 1]),
        _column_from_values([1, 1, 1]),
        _column_from_values([1, 1]),
    )
    empty_board = _board_from_columns([[], [], []])
    state = GameState(boards=(almost_full_board, empty_board), to_move=0)
    assert not is_full(state.boards[0])

    # 9マス目を置いた瞬間に終局する
    state, game_over = apply_move(state, column_index=2, value=1)
    assert game_over
    assert is_full(state.boards[0])


def test_apply_move_does_not_end_game_when_only_opponent_board_shrinks() -> None:
    state = initial_state(first_player=0)
    state, game_over = apply_move(state, column_index=0, value=6)  # player0
    assert not game_over
    # player1が同じ値を置く -> player0の列0の6は破壊されるが、盤面サイズが
    # 減っただけでは終局しない
    state, game_over = apply_move(state, column_index=0, value=6)
    assert not game_over
    assert state.boards[0][0] == _column_from_values([])


def test_winner_is_none_on_tie() -> None:
    # 異なる列に同じ値を置く(同じ列だと相手の破壊が発生し同点にならない)
    board_a = _board_from_columns([[3], [], []])
    board_b = _board_from_columns([[], [3], []])
    state = GameState(boards=(board_a, board_b), to_move=0)
    assert board_score(state.boards[0]) == board_score(state.boards[1])
    assert winner(state) is None


def test_winner_picks_higher_score() -> None:
    state = initial_state(first_player=0)
    state, _ = apply_move(state, column_index=0, value=6)
    state, _ = apply_move(state, column_index=0, value=1)
    assert winner(state) == 0


@pytest.mark.parametrize("seed", range(50))
def test_random_playthrough_terminates_within_max_moves(seed: int) -> None:
    import random

    # 破壊によって自分の盤面が後の相手の手番で減ることがあるため、総手数に
    # NUM_COLUMNS*COLUMN_CAPACITY*2のような固定の理論上限はない(実測では
    # ランダムプレイで最大でも数十手程度に収まる)。ここでの上限は理論値では
    # なく、無限ループ化するバグを検知するための安全装置として十分大きい値。
    rng = random.Random(seed)
    state = initial_state(first_player=rng.randint(0, 1))
    game_over = False
    num_moves = 0
    safety_cap = 500

    while not game_over:
        columns = legal_columns(state.boards[state.to_move])
        assert columns, "非終局状態で合法手が尽きてはならない"
        column = rng.choice(columns)
        value = rng.randint(1, DIE_FACES)
        state, game_over = apply_move(state, column, value)
        num_moves += 1
        assert num_moves <= safety_cap

    assert board_score(state.boards[0]) >= 0
    assert board_score(state.boards[1]) >= 0
