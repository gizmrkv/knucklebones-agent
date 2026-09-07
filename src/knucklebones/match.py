"""2エージェントを対戦させるオーケストレーション層。"""

from __future__ import annotations

import random
from dataclasses import dataclass

from knucklebones.agents.base import Agent
from knucklebones.core import (
    DIE_FACES,
    apply_move,
    board_score,
    initial_state,
    winner,
)


@dataclass(frozen=True)
class GameResult:
    winner: int | None
    scores: tuple[int, int]
    num_moves: int


def play_game(
    agent_0: Agent,
    agent_1: Agent,
    rng: random.Random,
    first_player: int = 0,
) -> GameResult:
    agents = (agent_0, agent_1)
    state = initial_state(first_player)
    num_moves = 0
    game_over = False
    while not game_over:
        agent = agents[state.to_move]
        rolled_value = rng.randint(1, DIE_FACES)
        column = agent.choose_column(state, rolled_value)
        state, game_over = apply_move(state, column, rolled_value)
        num_moves += 1

    scores = (board_score(state.boards[0]), board_score(state.boards[1]))
    return GameResult(winner=winner(state), scores=scores, num_moves=num_moves)
