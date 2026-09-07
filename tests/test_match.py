from __future__ import annotations

import random

from knucklebones.agents.expectimax import ExpectimaxAgent
from knucklebones.agents.random_agent import RandomAgent
from knucklebones.match import play_game

# 破壊で自分の盤面が後の相手の手番で減ることがあるため、総手数に固定の理論上限は
# ない(docs/knucklebones.core.apply_move参照)。ここでは無限ループを検知する
# ための安全装置として十分大きい値を使う。
_SAFETY_MOVE_CAP = 500


def test_play_game_result_is_internally_consistent() -> None:
    challenger = ExpectimaxAgent(depth=2)
    opponent = RandomAgent(random.Random(1))
    result = play_game(challenger, opponent, random.Random(0), first_player=0)

    assert 0 < result.num_moves <= _SAFETY_MOVE_CAP
    if result.scores[0] != result.scores[1]:
        assert result.winner == (0 if result.scores[0] > result.scores[1] else 1)
    else:
        assert result.winner is None


def test_expectimax_beats_random_agent_across_seeds() -> None:
    # 探索の符号ミス(min/maxの取り違え等)があれば、ランダム相手にすら勝ち越せなくなる。
    # 運要素があるため全勝は要求せず、明確な勝ち越しのみ確認する。
    wins = 0
    num_seeds = 10
    for seed in range(num_seeds):
        rng = random.Random(seed)
        challenger = ExpectimaxAgent(depth=2)
        opponent = RandomAgent(random.Random(seed + 1000))
        first_player = rng.randint(0, 1)
        result = play_game(challenger, opponent, rng, first_player=first_player)
        if result.winner == 0:
            wins += 1

    assert wins >= num_seeds * 0.7
