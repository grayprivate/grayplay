#!/usr/bin/env python3
"""Iterated Prisoner's Dilemma strategy tournament.

Runs a round-robin tournament between classic strategies, each pair playing
an iterated match, and prints a leaderboard by total score.
"""
from __future__ import annotations

import argparse
import random
from dataclasses import dataclass, field
from itertools import combinations_with_replacement

COOPERATE = "C"
DEFECT = "D"

# Payoffs for (my_move, opponent_move) -> my_score
PAYOFFS = {
    (COOPERATE, COOPERATE): 3,
    (COOPERATE, DEFECT): 0,
    (DEFECT, COOPERATE): 5,
    (DEFECT, DEFECT): 1,
}


class Strategy:
    name = "base"

    def move(self, my_history: list[str], opp_history: list[str]) -> str:
        raise NotImplementedError

    def reset(self) -> None:
        pass


class AlwaysCooperate(Strategy):
    name = "Always Cooperate"

    def move(self, my_history, opp_history):
        return COOPERATE


class AlwaysDefect(Strategy):
    name = "Always Defect"

    def move(self, my_history, opp_history):
        return DEFECT


class TitForTat(Strategy):
    name = "Tit for Tat"

    def move(self, my_history, opp_history):
        if not opp_history:
            return COOPERATE
        return opp_history[-1]


class TitForTwoTats(Strategy):
    name = "Tit for Two Tats"

    def move(self, my_history, opp_history):
        if len(opp_history) < 2:
            return COOPERATE
        if opp_history[-1] == DEFECT and opp_history[-2] == DEFECT:
            return DEFECT
        return COOPERATE


class GrimTrigger(Strategy):
    name = "Grim Trigger"

    def __init__(self):
        self.triggered = False

    def move(self, my_history, opp_history):
        if self.triggered or (opp_history and opp_history[-1] == DEFECT):
            self.triggered = True
            return DEFECT
        return COOPERATE

    def reset(self):
        self.triggered = False


class Pavlov(Strategy):
    """Win-Stay, Lose-Shift: repeat last move if it scored well, else switch."""

    name = "Pavlov"

    def move(self, my_history, opp_history):
        if not my_history:
            return COOPERATE
        last_score = PAYOFFS[(my_history[-1], opp_history[-1])]
        if last_score >= 3:
            return my_history[-1]
        return DEFECT if my_history[-1] == COOPERATE else COOPERATE


class RandomStrategy(Strategy):
    name = "Random"

    def move(self, my_history, opp_history):
        return random.choice([COOPERATE, DEFECT])


class Grudger(Strategy):
    """Alias-free variant kept distinct from GrimTrigger for clarity in output."""

    name = "Suspicious Tit for Tat"

    def move(self, my_history, opp_history):
        if not opp_history:
            return DEFECT
        return opp_history[-1]


ALL_STRATEGIES = [
    AlwaysCooperate,
    AlwaysDefect,
    TitForTat,
    TitForTwoTats,
    GrimTrigger,
    Pavlov,
    RandomStrategy,
    Grudger,
]


@dataclass
class MatchResult:
    score_a: int
    score_b: int
    history_a: list[str] = field(default_factory=list)
    history_b: list[str] = field(default_factory=list)


def play_match(strat_a: Strategy, strat_b: Strategy, rounds: int, noise: float = 0.0) -> MatchResult:
    strat_a.reset()
    strat_b.reset()
    history_a: list[str] = []
    history_b: list[str] = []
    score_a = 0
    score_b = 0

    for _ in range(rounds):
        move_a = strat_a.move(history_a, history_b)
        move_b = strat_b.move(history_b, history_a)

        if noise > 0:
            if random.random() < noise:
                move_a = DEFECT if move_a == COOPERATE else COOPERATE
            if random.random() < noise:
                move_b = DEFECT if move_b == COOPERATE else COOPERATE

        score_a += PAYOFFS[(move_a, move_b)]
        score_b += PAYOFFS[(move_b, move_a)]

        history_a.append(move_a)
        history_b.append(move_b)

    return MatchResult(score_a, score_b, history_a, history_b)


def run_tournament(strategy_classes, rounds: int, noise: float, seed: int | None):
    if seed is not None:
        random.seed(seed)

    instances = [cls() for cls in strategy_classes]
    totals = {s.name: 0 for s in instances}
    matches_played = {s.name: 0 for s in instances}

    for strat_a, strat_b in combinations_with_replacement(instances, 2):
        result = play_match(strat_a, strat_b, rounds, noise)
        totals[strat_a.name] += result.score_a
        matches_played[strat_a.name] += 1
        if strat_a is not strat_b:
            totals[strat_b.name] += result.score_b
            matches_played[strat_b.name] += 1

    leaderboard = sorted(totals.items(), key=lambda item: item[1], reverse=True)
    return leaderboard, matches_played


def print_leaderboard(leaderboard, matches_played):
    print(f"{'Rank':<5}{'Strategy':<26}{'Total Score':<14}{'Avg / Match':<12}")
    print("-" * 57)
    for rank, (name, total) in enumerate(leaderboard, start=1):
        played = matches_played[name]
        avg = total / played if played else 0
        print(f"{rank:<5}{name:<26}{total:<14}{avg:<12.2f}")


def main():
    parser = argparse.ArgumentParser(description="Run an iterated Prisoner's Dilemma tournament.")
    parser.add_argument("--rounds", type=int, default=200, help="Rounds per match (default: 200)")
    parser.add_argument("--noise", type=float, default=0.0, help="Probability a move is flipped by mistake (default: 0)")
    parser.add_argument("--seed", type=int, default=None, help="Random seed for reproducibility")
    args = parser.parse_args()

    leaderboard, matches_played = run_tournament(ALL_STRATEGIES, args.rounds, args.noise, args.seed)
    print_leaderboard(leaderboard, matches_played)


if __name__ == "__main__":
    main()
