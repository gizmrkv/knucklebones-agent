"""Expectimax探索によるエージェント(枝刈りなし、メモ化あり)。

評価関数は近似ヒューリスティックを持たず、常に厳密な自分スコア-相手スコアを使う。
Knucklebonesのスコア式は途中盤面でも意味を持つ関数(docs/RULES.md参照)なので、
深さカットオフでの評価にそのまま使ってよい。
"""

from __future__ import annotations

from knucklebones.core import (
    DIE_FACES,
    GameState,
    apply_move,
    board_score,
    legal_columns,
)


class ExpectimaxAgent:
    def __init__(self, depth: int = 4) -> None:
        if depth < 1:
            raise ValueError(f"depth must be at least 1 (depth={depth})")
        self._depth = depth
        self._cache: dict[tuple[GameState, int], float] = {}

    def choose_column(self, state: GameState, rolled_value: int) -> int:
        self._cache.clear()
        root_player = state.to_move
        columns = legal_columns(state.boards[root_player])
        if not columns:
            raise ValueError("no legal column to place a die into")

        best_column = columns[0]
        best_value = float("-inf")
        for column in columns:
            next_state, game_over = apply_move(state, column, rolled_value)
            value = self._chance_value(
                next_state, self._depth - 1, root_player, game_over
            )
            if value > best_value:
                best_value = value
                best_column = column
        return best_column

    def _evaluate(self, state: GameState, root_player: int) -> float:
        opponent = 1 - root_player
        return float(
            board_score(state.boards[root_player]) - board_score(state.boards[opponent])
        )

    def _chance_value(
        self,
        state: GameState,
        remaining_depth: int,
        root_player: int,
        game_over: bool,
    ) -> float:
        if game_over or remaining_depth <= 0:
            return self._evaluate(state, root_player)

        cache_key = (state, remaining_depth)
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        total = 0.0
        for value in range(1, DIE_FACES + 1):
            total += self._decision_value(state, value, remaining_depth, root_player)
        result = total / DIE_FACES
        self._cache[cache_key] = result
        return result

    def _decision_value(
        self,
        state: GameState,
        rolled_value: int,
        remaining_depth: int,
        root_player: int,
    ) -> float:
        is_maximizing = state.to_move == root_player
        best_value = float("-inf") if is_maximizing else float("inf")
        for column in legal_columns(state.boards[state.to_move]):
            next_state, game_over = apply_move(state, column, rolled_value)
            value = self._chance_value(
                next_state, remaining_depth - 1, root_player, game_over
            )
            if is_maximizing:
                best_value = max(best_value, value)
            else:
                best_value = min(best_value, value)
        return best_value
