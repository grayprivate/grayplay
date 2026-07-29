import unittest

from prisoners_dilemma import (
    COOPERATE,
    DEFECT,
    PAYOFFS,
    AlwaysCooperate,
    AlwaysDefect,
    GrimTrigger,
    Pavlov,
    TitForTat,
    TitForTwoTats,
    play_match,
    run_tournament,
    ALL_STRATEGIES,
)


class PayoffTests(unittest.TestCase):
    def test_mutual_cooperation(self):
        self.assertEqual(PAYOFFS[(COOPERATE, COOPERATE)], 3)

    def test_mutual_defection(self):
        self.assertEqual(PAYOFFS[(DEFECT, DEFECT)], 1)

    def test_temptation_beats_sucker(self):
        self.assertGreater(PAYOFFS[(DEFECT, COOPERATE)], PAYOFFS[(COOPERATE, DEFECT)])


class StrategyTests(unittest.TestCase):
    def test_always_cooperate_always_returns_c(self):
        s = AlwaysCooperate()
        self.assertEqual(s.move([], []), COOPERATE)
        self.assertEqual(s.move([COOPERATE], [DEFECT]), COOPERATE)

    def test_always_defect_always_returns_d(self):
        s = AlwaysDefect()
        self.assertEqual(s.move([], []), DEFECT)

    def test_tit_for_tat_opens_with_cooperate_then_mirrors(self):
        s = TitForTat()
        self.assertEqual(s.move([], []), COOPERATE)
        self.assertEqual(s.move([COOPERATE], [DEFECT]), DEFECT)
        self.assertEqual(s.move([DEFECT], [COOPERATE]), COOPERATE)

    def test_tit_for_two_tats_forgives_single_defection(self):
        s = TitForTwoTats()
        self.assertEqual(s.move([COOPERATE], [DEFECT]), COOPERATE)
        self.assertEqual(s.move([COOPERATE, COOPERATE], [DEFECT, DEFECT]), DEFECT)

    def test_grim_trigger_never_forgives(self):
        s = GrimTrigger()
        self.assertEqual(s.move([], []), COOPERATE)
        s.move([COOPERATE], [DEFECT])  # opponent defects, trigger flips
        self.assertTrue(s.triggered)
        self.assertEqual(s.move([DEFECT], [COOPERATE]), DEFECT)

    def test_pavlov_repeats_winning_move(self):
        s = Pavlov()
        self.assertEqual(s.move([], []), COOPERATE)
        self.assertEqual(s.move([COOPERATE], [COOPERATE]), COOPERATE)
        self.assertEqual(s.move([COOPERATE], [DEFECT]), DEFECT)


class MatchTests(unittest.TestCase):
    def test_two_cooperators_maximize_joint_score(self):
        result = play_match(AlwaysCooperate(), AlwaysCooperate(), rounds=10)
        self.assertEqual(result.score_a, 30)
        self.assertEqual(result.score_b, 30)

    def test_defector_beats_cooperator(self):
        result = play_match(AlwaysDefect(), AlwaysCooperate(), rounds=10)
        self.assertGreater(result.score_a, result.score_b)

    def test_tit_for_tat_matches_cooperator_score(self):
        result = play_match(TitForTat(), AlwaysCooperate(), rounds=10)
        self.assertEqual(result.score_a, result.score_b)


class TournamentTests(unittest.TestCase):
    def test_leaderboard_covers_all_strategies(self):
        leaderboard, matches_played = run_tournament(ALL_STRATEGIES, rounds=20, noise=0.0, seed=1)
        names = {name for name, _ in leaderboard}
        expected_names = {cls().name for cls in ALL_STRATEGIES}
        self.assertEqual(names, expected_names)
        for name in expected_names:
            self.assertGreater(matches_played[name], 0)

    def test_reproducible_with_seed(self):
        leaderboard_1, _ = run_tournament(ALL_STRATEGIES, rounds=50, noise=0.1, seed=7)
        leaderboard_2, _ = run_tournament(ALL_STRATEGIES, rounds=50, noise=0.1, seed=7)
        self.assertEqual(leaderboard_1, leaderboard_2)


if __name__ == "__main__":
    unittest.main()
