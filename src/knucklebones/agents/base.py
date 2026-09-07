"""エージェントの共通インターフェース。"""

from __future__ import annotations

from typing import Protocol

from knucklebones.core import GameState


class Agent(Protocol):
    def choose_column(self, state: GameState, rolled_value: int) -> int: ...
