#!/usr/bin/env python3
"""
Generate the full 3-slot combination matrix for every weapon.

A build is (weapon, slot1_part, slot2_part, slot3_part). Each axis is only the
parts that fit that slot type, plus "empty" -- so the matrix is tractable rather
than parts^3.

Implements the resolver spec in docs/PARTS.md section 4. Must stay deterministic:
the same inputs always produce the same build, because client and server both
compute it and sync only an 8-byte hash.

    python3 tools/build_matrix.py            # stats to stdout
    python3 tools/build_matrix.py --write    # also emit build/matrix.json + .csv
"""
import json, os, sys, csv, itertools, collections, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D    = lambda *p: os.path.join(ROOT, *p)

TIER_NAMES  = {0: "Blocked", 1: "Bleed", 2: "Plain", 3: "Combo", 4: "Masterpiece"}
TIER_THIRST = {1: 1.1, 2: 1.0, 3: 1.25, 4: 1.5}
TIER_FLOOR  = {1: 0.0, 2: 0.0, 3: 3.0, 4: 6.0}


def load():
    weapons = json.load(open(D("data", "weapons.json")))["weapons"]
    pdata   = json.load(open(D("data", "parts.json")))
    pairs   = json.load(open(D("data", "tables", "pairs.json")))
    triples = json.load(open(D("data", "tables", "triples.json")))

    parts = {p["id"]: p for p in pdata["parts"]}
    media = pdata["media"]

    # Rules are keyed on sorted tag tuples, never part ids.
    combo_tbl  = {tuple(sorted(c["tags"])): c for c in pairs["combos"]}
    bleed_tbl  = {tuple(sorted(b["tags"])): b for b in pairs["bleeds"]}
    triple_tbl = {tuple(sorted(m["tags"])): m for m in triples["masterpieces"]}
    return weapons, parts, media, combo_tbl, bleed_tbl, triple_tbl


def blocked_reason(part, weapon):
    """Structural checks only -- slot, weapon tag bans, weapon medium bans."""
    only = weapon.get("only_media")
    if only is not None and part["medium"] not in only:
        return "%s takes only %s parts" % (weapon["name"], "/".join(only).title())
    if part["medium"] in weapon.get("banned_media", []):
        return "%s cannot carry %s" % (weapon["name"], part["medium"].title())
    banned = set(part["tags"]) & set(weapon["banned_tags"])
    if banned:
        return "%s bans %s" % (weapon["name"], ", ".join(sorted(banned)))
    return None


def tag_multiset(installed, weapon):
    """Tags per part, plus Marker slot-bleed copying tags into adjacent slots."""
    tags = [list(p["tags"]) for p in installed]
    if weapon.get("slot_bleed"):
        for i, p in enumerate(installed):
            if p["medium"] == "MARKER":
                for j in (i - 1, i + 1):
                    if 0 <= j < len(installed):
                        tags[j] = tags[j] + [t for t in p["tags"] if t not in tags[j]]
    return tags


def resolve(weapon, chosen, combo_tbl, bleed_tbl, triple_tbl, media):
    """chosen: list of part dicts or None, one per weapon slot."""
    installed = [p for p in chosen if p]

    # 1. STRUCTURE
    for p in installed:
        why = blocked_reason(p, weapon)
        if why:
            return {"tier": 0, "name": "Blocked", "effect": why,
                    "interactions": [], "thirst": None}

    # 2. ADJACENCY  3. PAIRS  4. TRIPLES
    tags = tag_multiset(installed, weapon)
    hits, tier = [], 2

    triple_hit = None
    if len(installed) == 3:
        for combi in itertools.product(*tags):
            key = tuple(sorted(combi))
            if key in triple_tbl:
                triple_hit = triple_tbl[key]
                break

    if triple_hit:
        tier = 4
        hits.append({"kind": "masterpiece", "name": triple_hit["name"],
                     "effect": triple_hit["effect"], "tags": sorted(triple_hit["tags"])})
    else:
        for i, j in itertools.combinations(range(len(installed)), 2):
            for ta, tb in itertools.product(tags[i], tags[j]):
                key = tuple(sorted((ta, tb)))
                if key in combo_tbl:
                    c = combo_tbl[key]
                    if not any(h["name"] == c["name"] for h in hits):
                        hits.append({"kind": "combo", "name": c["name"],
                                     "effect": c["effect"], "tags": list(key)})
                        tier = max(tier, 3)
                elif key in bleed_tbl:
                    b = bleed_tbl[key]
                    if not any(h["name"] == b["name"] for h in hits):
                        hits.append({"kind": "bleed", "name": b["name"],
                                     "effect": b["effect"], "tags": list(key)})
                        tier = max(tier, 1) if tier == 2 else tier
        # A Bleed with no Combo alongside it drops the whole build to Bleed.
        if tier == 2 and any(h["kind"] == "bleed" for h in hits):
            tier = 1

    # 6. THIRST
    raw    = sum(media[p["medium"]]["draw"] for p in installed) * TIER_THIRST[tier]
    thirst = round(max(raw, TIER_FLOOR[tier]) if installed else 0.0, 2)

    if hits:
        name   = " + ".join(h["name"] for h in hits)
        effect = " ".join(h["effect"] for h in hits)
    else:
        name   = "Plain"
        effect = "No interaction. The parts stack their stats and mind their own business."

    return {"tier": tier, "name": name, "effect": effect,
            "interactions": hits, "thirst": thirst}


def build_signature(weapon, chosen):
    raw = weapon["id"] + "|" + "|".join(p["id"] if p else "-" for p in chosen)
    return hashlib.blake2b(raw.encode(), digest_size=8).hexdigest()


def main():
    weapons, parts, media, combo_tbl, bleed_tbl, triple_tbl = load()
    by_slot = collections.defaultdict(list)
    for p in parts.values():
        by_slot[p["slot"]].append(p)
    for v in by_slot.values():
        v.sort(key=lambda p: p["id"])

    matrix, stats = {}, collections.Counter()
    per_weapon, named = {}, collections.Counter()

    for w in weapons:
        axes = [[None] + by_slot[s] for s in w["slots"]]
        cells, wstat = [], collections.Counter()
        for chosen in itertools.product(*axes):
            r = resolve(w, list(chosen), combo_tbl, bleed_tbl, triple_tbl, media)
            wstat[r["tier"]] += 1
            stats[r["tier"]] += 1
            for h in r["interactions"]:
                named[h["name"]] += 1
            cells.append({
                "parts": [p["id"] if p else None for p in chosen],
                "tier": r["tier"], "name": r["name"], "effect": r["effect"],
                "thirst": r["thirst"], "sig": build_signature(w, list(chosen)),
            })
        matrix[w["id"]] = {"slots": w["slots"],
                           "axes": [[p["id"] for p in ax if p] for ax in axes],
                           "cells": cells}
        per_weapon[w["id"]] = wstat
        cells_full = [c for c in cells if all(c["parts"])]
        print("%-13s %s  %4d cells (%3d full 3-part)  blocked %4d  bleed %3d  plain %4d  combo %4d  m'piece %3d"
              % (w["name"], "/".join(s[:3] for s in w["slots"]), len(cells), len(cells_full),
                 wstat[0], wstat[1], wstat[2], wstat[3], wstat[4]))

    total = sum(stats.values())
    print("\n%d total cells across %d weapons" % (total, len(weapons)))
    for t in range(5):
        print("  %-12s %6d  %5.1f%%" % (TIER_NAMES[t], stats[t], 100.0 * stats[t] / total))

    # The player-facing number is not "% of the matrix blocked" -- with 3 slots that
    # compounds. It is "I picked up a card; does it fit my gun?"
    print("\nCard-fit rate -- of the parts that fit a weapon's slot types, how many are legal:")
    worst = []
    for w in weapons:
        elig = [p for s_ in w["slots"] for p in by_slot[s_]]
        ok = [p for p in elig if blocked_reason(p, w) is None]
        pct = 100.0 * len(ok) / len(elig)
        worst.append((pct, w["name"]))
        print("  %-13s %2d/%2d  %5.1f%%" % (w["name"], len(ok), len(elig), pct))
    worst.sort()
    print("  -> worst: %s at %.1f%%" % (worst[0][1], worst[0][0]))

    # Thirst has to scale with power, or "balance by making it drink" is not happening.
    print("\nMean thirst by tier (does power actually cost more to run?):")
    for t in (1, 2, 3, 4):
        vals = [c["thirst"] for m in matrix.values() for c in m["cells"]
                if c["tier"] == t and c["thirst"] is not None and all(c["parts"])]
        if vals:
            print("  %-12s n=%-5d mean %5.2f   max %5.2f" %
                  (TIER_NAMES[t], len(vals), sum(vals)/len(vals), max(vals)))

    print("\nMasterpiece reach -- which weapons can hit the ceiling of the system:")
    for w in weapons:
        names = sorted({c["name"] for c in matrix[w["id"]]["cells"] if c["tier"] == 4})
        print("  %-13s %s" % (w["name"], ", ".join(names) if names else "-- none reachable --"))

    legal = total - stats[0]
    print("\n%d legal builds. Of those: %.1f%% do something (combo/bleed/masterpiece), %.1f%% are Plain."
          % (legal, 100.0 * (stats[1] + stats[3] + stats[4]) / legal, 100.0 * stats[2] / legal))

    print("\nUnreachable rules (authored but no legal build produces them):")
    authored = ([c["name"] for c in json.load(open(D("data","tables","pairs.json")))["combos"]]
                + [b["name"] for b in json.load(open(D("data","tables","pairs.json")))["bleeds"]]
                + [m["name"] for m in json.load(open(D("data","tables","triples.json")))["masterpieces"]])
    dead = [n for n in authored if named[n] == 0]
    print("  " + (", ".join(dead) if dead else "none -- every authored rule is reachable"))

    print("\nTop 10 most common interactions:")
    for n, c in named.most_common(10):
        print("  %-22s %5d" % (n, c))

    if "--write" in sys.argv:
        os.makedirs(D("build"), exist_ok=True)
        json.dump({"weapons": weapons, "parts": parts, "media": media, "matrix": matrix},
                  open(D("build", "matrix.json"), "w"), indent=None, separators=(",", ":"))
        with open(D("build", "matrix.csv"), "w", newline="") as f:
            wr = csv.writer(f)
            wr.writerow(["weapon", "slot1", "slot2", "slot3", "tier", "tier_name",
                         "result", "thirst", "signature"])
            for wid, m in matrix.items():
                for c in m["cells"]:
                    wr.writerow([wid] + [p or "" for p in c["parts"]] +
                                [c["tier"], TIER_NAMES[c["tier"]], c["name"],
                                 c["thirst"] if c["thirst"] is not None else "", c["sig"]])
        print("\nwrote build/matrix.json and build/matrix.csv")


if __name__ == "__main__":
    main()
