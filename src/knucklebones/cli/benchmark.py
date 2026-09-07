"""ExpectimaxAgentの強さをRandomAgent/別depthのExpectimaxAgentと対戦させて測定するCLI。"""

from __future__ import annotations

import random
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import polars as pl
import structlog
import tyro

from knucklebones.agents.base import Agent
from knucklebones.agents.expectimax import ExpectimaxAgent
from knucklebones.agents.random_agent import RandomAgent
from knucklebones.match import play_game

log = structlog.get_logger()


@dataclass
class BenchmarkConfig:
    num_games: int = 200
    seed: int = 0
    challenger_depth: int = 4
    opponent: Literal["random", "expectimax"] = "random"
    opponent_depth: int = 4
    log_path: Path = Path("results/benchmark.log")


def _configure_logging(log_path: Path) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.JSONRenderer(),
        ],
        logger_factory=structlog.WriteLoggerFactory(file=log_path.open("a")),
    )


def _make_opponent(config: BenchmarkConfig) -> Agent:
    if config.opponent == "random":
        return RandomAgent(random.Random(config.seed + 1))
    return ExpectimaxAgent(depth=config.opponent_depth)


def run(config: BenchmarkConfig) -> pl.DataFrame:
    rng = random.Random(config.seed)
    challenger = ExpectimaxAgent(depth=config.challenger_depth)
    opponent = _make_opponent(config)

    rows = []
    for game_index in range(config.num_games):
        game_rng = random.Random(rng.randint(0, 2**31 - 1))
        first_player = rng.randint(0, 1)

        started_at = time.perf_counter()
        result = play_game(challenger, opponent, game_rng, first_player=first_player)
        elapsed_seconds = time.perf_counter() - started_at

        log.info(
            "game_finished",
            game_index=game_index,
            first_player=first_player,
            winner=result.winner,
            challenger_score=result.scores[0],
            opponent_score=result.scores[1],
            num_moves=result.num_moves,
            elapsed_seconds=elapsed_seconds,
        )
        rows.append(
            {
                "game_index": game_index,
                "first_player": first_player,
                "winner": result.winner,
                "challenger_score": result.scores[0],
                "opponent_score": result.scores[1],
                "num_moves": result.num_moves,
                "elapsed_seconds": elapsed_seconds,
            }
        )

    return pl.DataFrame(rows)


def summarize(df: pl.DataFrame) -> pl.DataFrame:
    return df.select(
        pl.len().alias("num_games"),
        (pl.col("winner") == 0).sum().alias("challenger_wins"),
        (pl.col("winner") == 1).sum().alias("opponent_wins"),
        pl.col("winner").is_null().sum().alias("draws"),
        pl.col("elapsed_seconds").mean().alias("mean_seconds_per_game"),
    )


def main() -> None:
    config = tyro.cli(BenchmarkConfig)
    _configure_logging(config.log_path)

    df = run(config)
    summary = summarize(df).to_dicts()[0]
    log.info("benchmark_summary", **summary)


if __name__ == "__main__":
    main()
