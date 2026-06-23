#!/usr/bin/env python3
"""
Create the HQ.ai C10 pricing catalogue in Stripe via the Stripe CLI.

C10 = split self-serve (HQ People base + HQ Recruit metered add-on + the
Complete bundle) plus the renamed human-advisor layer (HR365 / Recruit365 /
HR365 + Recruit365). Source of truth: lib/pricing-config.ts and
docs/research/2026-06-23_pricing-deep-analysis.md Section 12.

Reads the Stripe secret key from STRIPE_API_KEY (never printed). Creates
products + prices and writes a ready-to-paste env block to
scripts/stripe-c10-price-ids.env.

IMPORTANT - this REUSES the existing env-var KEY names for the bundle and the
HR365/Recruit365 layer (so the app code keeps resolving them with no change),
but points them at NEW price objects at the new amounts:
  - Business (the Complete bundle) is now $269/mo ($2,690/yr).
  - Foundation 100 is now $189/mo equiv ($2,268/yr locked annual).
  - HR365 (was "Enterprise People") is now $799/mo annual-equiv ($9,588/yr),
    $950/mo monthly-rolling.
  - Recruit365 (was "Enterprise Recruit") is now $899 / $1,070.
  - HR365 + Recruit365 (was "Full") is now $1,599 / $1,899.
It also creates NEW keys for the standalone HQ People + HQ Recruit add-on
(STRIPE_PRICE_ID_PEOPLE_* / STRIPE_PRICE_ID_RECRUIT_*) - wire these into
lib/stripe.ts when standalone checkout for those SKUs is built.

Amounts are AUD cents. Run via the same wrapper that supplies STRIPE_BIN +
STRIPE_API_KEY (see run-stripe-v2-setup.sh). Use a TEST key first.
"""
import json
import os
import subprocess
import sys

STRIPE = os.environ["STRIPE_BIN"]
KEY = os.environ["STRIPE_API_KEY"]


def run(args):
    out = subprocess.run(
        [STRIPE, *args, "--api-key", KEY],
        capture_output=True, text=True,
    )
    if out.returncode != 0:
        sys.stderr.write(f"FAILED: stripe {' '.join(args)}\n{out.stderr}\n")
        sys.exit(1)
    return json.loads(out.stdout)


def create_product(name):
    obj = run(["products", "create", "--name", name])
    print(f"  product: {name} -> {obj['id']}")
    return obj["id"]


def create_price(product_id, amount, interval, nickname):
    args = ["prices", "create", "--product", product_id,
            "--unit-amount", str(amount), "--currency", "aud",
            "-d", f"nickname={nickname}"]
    if interval:  # 'month' or 'year' for recurring; None for one-time
        args += ["-d", f"recurring[interval]={interval}"]
    obj = run(args)
    print(f"    price: {nickname} ({amount}c {interval or 'one-time'}) -> {obj['id']}")
    return obj["id"]


def main():
    ids = {}

    # -- Self-serve: the Complete BUNDLE (reuses solo/business keys) -----
    # Solo Complete = $89 (unchanged), Business Complete = $269 (new).
    solo = create_product("HQ.ai - Solo Complete (HR + hiring)")
    ids["STRIPE_PRICE_ID_SOLO_MONTHLY"] = create_price(solo, 8900, "month", "Solo Complete monthly")
    ids["STRIPE_PRICE_ID_SOLO_ANNUAL"] = create_price(solo, 89000, "year", "Solo Complete annual")

    biz = create_product("HQ.ai - Business Complete (HR + hiring)")
    ids["STRIPE_PRICE_ID_BUSINESS_MONTHLY"] = create_price(biz, 26900, "month", "Business Complete monthly")
    ids["STRIPE_PRICE_ID_BUSINESS_ANNUAL"] = create_price(biz, 269000, "year", "Business Complete annual")
    # Foundation 100: $189/mo equiv, locked annual = 189*12 = $2,268/yr.
    ids["STRIPE_PRICE_ID_BUSINESS_FOUNDATION"] = create_price(biz, 226800, "year", "Business Complete Foundation 100 (annual, locked)")

    # -- Self-serve: standalone HQ People (NEW keys) --------------------
    people = create_product("HQ People (HR)")
    ids["STRIPE_PRICE_ID_PEOPLE_SOLO_MONTHLY"] = create_price(people, 5900, "month", "HQ People up to 25 monthly")
    ids["STRIPE_PRICE_ID_PEOPLE_SOLO_ANNUAL"] = create_price(people, 59000, "year", "HQ People up to 25 annual")
    ids["STRIPE_PRICE_ID_PEOPLE_BUSINESS_MONTHLY"] = create_price(people, 17900, "month", "HQ People up to 150 monthly")
    ids["STRIPE_PRICE_ID_PEOPLE_BUSINESS_ANNUAL"] = create_price(people, 179000, "year", "HQ People up to 150 annual")

    # -- Self-serve: HQ Recruit metered add-on (NEW keys) ---------------
    recruit = create_product("HQ Recruit add-on (hiring)")
    ids["STRIPE_PRICE_ID_RECRUIT_LIGHT_MONTHLY"] = create_price(recruit, 4000, "month", "HQ Recruit Light (1 role) monthly")
    ids["STRIPE_PRICE_ID_RECRUIT_PRO_MONTHLY"] = create_price(recruit, 12000, "month", "HQ Recruit Pro (unlimited) monthly")

    # -- Done-for-you human layer: HR365 / Recruit365 (reuse ENT keys) --
    hr365 = create_product("HR365 (HR human advisor on call)")
    ids["STRIPE_PRICE_ID_ENTERPRISE_PEOPLE_ANNUAL"] = create_price(hr365, 958800, "year", "HR365 annual ($799/mo equiv)")
    ids["STRIPE_PRICE_ID_ENTERPRISE_PEOPLE_MONTHLY"] = create_price(hr365, 95000, "month", "HR365 monthly-rolling ($950)")

    recruit365 = create_product("Recruit365 (recruitment human advisor on call)")
    ids["STRIPE_PRICE_ID_ENTERPRISE_RECRUIT_ANNUAL"] = create_price(recruit365, 1078800, "year", "Recruit365 annual ($899/mo equiv)")
    ids["STRIPE_PRICE_ID_ENTERPRISE_RECRUIT_MONTHLY"] = create_price(recruit365, 107000, "month", "Recruit365 monthly-rolling ($1,070)")

    both365 = create_product("HR365 + Recruit365 (both advisors)")
    ids["STRIPE_PRICE_ID_ENTERPRISE_FULL_ANNUAL"] = create_price(both365, 1918800, "year", "HR365 + Recruit365 annual ($1,599/mo equiv)")
    ids["STRIPE_PRICE_ID_ENTERPRISE_FULL_MONTHLY"] = create_price(both365, 189900, "month", "HR365 + Recruit365 monthly-rolling ($1,899)")

    # NOTE: the one-off marketplace SKUs are UNCHANGED from the v2 catalogue
    # (Letter of Offer $25 ... Reference Check $25). Keep the existing
    # STRIPE_PRICE_ID_LETTER_OF_OFFER etc. - they are not recreated here.

    # -- Write the env block --------------------------------------------
    out_name = os.environ.get("STRIPE_OUT_FILE", "stripe-c10-price-ids.env")
    out_path = os.path.join(os.path.dirname(__file__), out_name)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("# HQ.ai C10 Stripe price ids. Paste into Vercel env (and .env.local).\n")
        f.write("# Generated by scripts/stripe-c10-setup.py\n")
        f.write("# Reuses the bundle + HR365/Recruit365 key names; adds PEOPLE_* + RECRUIT_*.\n")
        f.write("# One-off SKU keys (LETTER_OF_OFFER etc) are unchanged - keep the v2 values.\n\n")
        for k, v in ids.items():
            f.write(f"{k}={v}\n")
    print(f"\nWrote {len(ids)} price ids to {out_path}")
    print("Next: paste these into Vercel (Production + Preview + Development) and redeploy.")


if __name__ == "__main__":
    main()
