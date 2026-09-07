"""合法な列から一様ランダムに選ぶベースラインエージェント。"""

from __future__ import annotations

import random

from knucklebones.core import GameState, legal_columns


class RandomAgent:
    def __init__(self, rng: random.Random) -> None:
        self._rng = rng

    def choose_column(self, state: GameState, rolled_value: int) -> int:
        columns = legal_columns(state.boards[state.to_move])
        if not columns:
            raise ValueError("no legal column to place a die into")
        return self._rng.choice(columns)
