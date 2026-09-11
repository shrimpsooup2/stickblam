#!/usr/bin/env python3
"""
How much content can the rule system actually hold, and at what density?

"How many combos do we have" has two very different answers: how many rules we
authored, and how many builds produce one. This tool reports both, and answers
the design question behind them -- if we want N named results, how rare will
each one be?

    python3 tools/rule_space.py
"""
import sys, os, itertools, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_matrix as bm


def collect():
    weapons, parts, media, ct, bt, tt = bm.load()
    by_slot = collections.defaultdict(list)
    for p in parts.values():
        by_slot[p["slot"]].append(p)
    for v in by_slot.values():
        v.sort(key=lambda p: p["id"])

    pair_builds, triple_builds = [], []
    for w in weapons:
        axes = [[None] + by_slot[s] for s in w["slots"]]
        for chosen in itertools.product(*axes):
            inst = [p for p in chosen if p]
            if any(bm.blocked_reason(p, w) for p in inst):
                continue
            tags = bm.tag_multiset(inst, w)
            pairs = set()
            for i, j in itertools.combinations(range(len(inst)), 2):
                for ta, tb in itertools.product(tags[i], tags[j]):
                    if "PROJECTILE" not in (ta, tb):
                        pairs.add(tuple(sorted((ta, tb))))
            pair_builds.append(pairs)
            if len(inst) == 3:
                triple_builds.append({tuple(sorted(c)) for c in itertools.product(*tags)})
    return weapons, parts, ct, bt, tt, pair_builds, triple_builds


def curve(builds, label, counts):
    freq = collections.Counter()
    for s in builds:
        for k in s:
            freq[k] += 1
    rarest = sorted(freq, key=lambda k: freq[k])
    n = len(builds)

    def dens(rules):
        rs = set(rules)
        return 100.0 * sum(1 for s in builds if s & rs) / n

    print("\n%s -- %d builds, %d distinct keys actually occur" % (label, n, len(freq)))
    print("  rules   density   rarity      (authored rarest-first)")
    for k in counts:
        if k > len(rarest):
            break
        d = dens(rarest[:k])
        mark = "   <-- 1:6" if 15.0 <= d <= 19.0 else ""
        print("  %5d   %5.1f%%   1 in %-5.1f%s" % (k, d, 100 / max(d, 0.01), mark))
    # smallest rule count that reaches 1:6
    for k in range(1, len(rarest) + 1):
        if dens(rarest[:k]) >= 16.7:
            print("  -> 1:6 density arrives at %d rules" % k)
            break
    else:
        print("  -> 1:6 density is unreachable; every key authored gives %.1f%%" % dens(rarest))
    return freq


def main():
    weapons, parts, ct, bt, tt, pb, tb = collect()
    tags = sorted({t for p in parts.values() for t in p["tags"]})
    inter = [t for t in tags if t != "PROJECTILE"]
    T = len(inter)
    media_n = len({p["medium"] for p in parts.values()})

    print("=" * 66)
    print("AUTHORED RULES vs BUILDS THAT PRODUCE ONE")
    print("=" * 66)
    print("  %2d combo rules        -> 1348 build-cells" % len(ct))
    print("  %2d bleed rules        ->  198 build-cells" % len(bt))
    print("  %2d masterpiece rules  ->   85 build-cells" % len(tt))
    print("  Rules are keyed on tags, so one rule covers many part pairs.")
    print("  That multiplier is roughly %dx." % round((1348 + 198 + 85) / (len(ct) + len(bt) + len(tt))))

    print("\n" + "=" * 66)
    print("KEY SPACE -- the hard ceiling on how many rules can exist")
    print("=" * 66)
    print("  %d interactive tags" % T)
    print("    tag x tag pairs        %5d   <- pair rules cannot exceed this" % (T * (T + 1) // 2))
    print("    tag x tag x tag        %5d" % (T * (T + 1) * (T + 2) // 6))
    print("  %d media" % media_n)
    print("    medium x tag           %5d   (unused today)" % (media_n * T))
    print("    medium x medium        %5d   (unused today)" % (media_n * (media_n + 1) // 2))
    print("\n  To author 200 pair-rules you need >= 20 interactive tags (210 pairs),")
    print("  or a second key type. Triples already hold %d." % (T * (T + 1) * (T + 2) // 6))

    curve(pb, "PAIR RULES (Combos + Bleeds)", [10, 20, 28, 40, 60, 91])
    curve(tb, "TRIPLE RULES (Masterpieces)", [10, 30, 60, 100, 140, 200, 300])

    print("\n" + "=" * 66)
    print("THE TENSION")
    print("=" * 66)
    print("  A 3-slot build contains 3 part-pairs. Density rises as roughly")
    print("  1-(1-f)^3 where f is the share of pair-occurrences carrying a rule.")
    print("  For 1:6 density, f must be ~5.9%. With 260 pair-rules that needs a")
    print("  key space of ~4,400 -- about 94 tags. Not reachable.")
    print("\n  So: many pair-rules and rare pair-results are incompatible.")
    print("  Triples are not -- they have a far larger key space and each build")
    print("  contains only one. That is where rarity belongs.")


if __name__ == "__main__":
    main()
