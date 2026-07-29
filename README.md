# Prisoner's Dilemma Tournament

An iterated Prisoner's Dilemma strategy tournament, in the style of Axelrod's
classic experiments. Eight strategies play round-robin, each pair facing off
over many rounds, and the results are ranked on a leaderboard.

## Strategies

- Always Cooperate
- Always Defect
- Tit for Tat
- Tit for Two Tats
- Grim Trigger
- Pavlov (Win-Stay, Lose-Shift)
- Random
- Suspicious Tit for Tat (defects on the first move, then mirrors)

## Usage

```bash
python3 prisoners_dilemma.py --rounds 200 --seed 42
```

Options:

- `--rounds`: number of rounds per match (default 200)
- `--noise`: probability a move is accidentally flipped, simulating
  miscommunication (default 0)
- `--seed`: random seed for reproducible results

## Tests

```bash
python3 -m unittest test_prisoners_dilemma.py -v
```
