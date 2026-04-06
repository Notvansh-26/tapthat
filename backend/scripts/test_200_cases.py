"""
Test 200 cases across different Texas counties, ZIP codes, and population sizes.
Checks: population accuracy, risk levels, violation counts, contaminant names.

Run: cd backend && python -m scripts.test_200_cases
"""

import csv
import io
import json
import logging
from datetime import datetime

from sqlalchemy import text
from app.database import engine, SessionLocal
from app.services.water_service import WaterService

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ── Test ZIP codes across Texas: mix of big cities, suburbs, rural, border ───
TEST_ZIPS = [
    # Major metro areas
    "77001", "77002", "77003", "77004", "77005",  # Houston (Harris)
    "77006", "77007", "77008", "77009", "77010",
    "77019", "77024", "77025", "77030", "77040",
    "77042", "77056", "77057", "77077", "77083",  # Houston suburbs
    "77084", "77094", "77095", "77096", "77098",
    "75201", "75202", "75204", "75205", "75206",  # Dallas
    "75207", "75208", "75209", "75210", "75211",
    "75214", "75219", "75225", "75228", "75230",
    "75235", "75240", "75243", "75248", "75252",
    "78201", "78202", "78204", "78205", "78207",  # San Antonio (Bexar)
    "78209", "78210", "78212", "78213", "78215",
    "78216", "78217", "78218", "78220", "78224",
    "78228", "78229", "78230", "78232", "78237",
    "78240", "78245", "78247", "78249", "78250",
    "76101", "76102", "76103", "76104", "76105",  # Fort Worth (Tarrant)
    "76106", "76107", "76109", "76110", "76111",
    "76112", "76114", "76116", "76117", "76118",
    "76119", "76120", "76123", "76126", "76129",
    "78701", "78702", "78703", "78704", "78705",  # Austin (Travis)
    "78717", "78721", "78723", "78726", "78727",
    "78728", "78729", "78731", "78735", "78741",
    "78744", "78745", "78748", "78749", "78750",
    "78751", "78752", "78753", "78756", "78757",

    # Mid-size cities
    "79901", "79902", "79903", "79905", "79907",  # El Paso
    "79912", "79915", "79924", "79925", "79930",
    "78401", "78404", "78405", "78408", "78411",  # Corpus Christi (Nueces)
    "78412", "78413", "78414", "78415", "78418",
    "79601", "79602", "79603", "79605", "79606",  # Abilene (Taylor)
    "75501", "75503",                               # Texarkana (Bowie)
    "79761", "79762", "79763", "79764", "79765",  # Odessa (Ector)
    "79701", "79703", "79705", "79706", "79707",  # Midland
    "76501", "76502", "76504", "76508", "76513",  # Killeen/Temple (Bell)
    "78130", "78132",                               # New Braunfels (Comal)
    "75901", "75904",                               # Lufkin (Angelina)
    "78520", "78521", "78526",                      # Brownsville (Cameron)
    "78501", "78503", "78504",                      # McAllen (Hidalgo)
    "75702", "75703", "75707",                      # Tyler (Smith)
    "79401", "79403", "79404", "79407", "79410",  # Lubbock
    "79411", "79412", "79413", "79414", "79415",

    # Rural / small town
    "76943",  # Ozona (Crockett)
    "79735",  # Fort Stockton (Pecos)
    "79830",  # Alpine (Brewster)
    "79843",  # Marfa (Presidio)
    "76825",  # Brady (McCulloch)
    "76856",  # Mason (Mason)
    "79036",  # Fritch (Hutchinson)
    "79065",  # Panhandle (Carson)
    "76367",  # Iowa Park (Wichita)
    "76384",  # Vernon (Wilbarger)
]


def run_tests():
    db = SessionLocal()
    svc = WaterService(db)

    results = []
    total = len(TEST_ZIPS)
    found = 0
    not_found = 0

    # Also get county-level stats for cross-reference
    county_risks = svc.get_county_risks()
    county_map = {r["county"].upper(): r for r in county_risks}

    for i, zip_code in enumerate(TEST_ZIPS):
        report = svc.get_zip_report(zip_code)
        if not report:
            not_found += 1
            results.append({
                "zip": zip_code,
                "status": "NOT_FOUND",
                "population": 0,
                "systems": 0,
                "risk": "N/A",
                "violations_3yr": 0,
                "health_violations": 0,
                "has_contaminant_names": "N/A",
                "violation_detail_count": 0,
                "contaminant_code_issues": "",
                "county": "",
            })
            continue

        found += 1
        total_violations = sum(s.violation_count_3yr for s in report.water_systems)
        total_health = sum(s.health_violation_count_3yr for s in report.water_systems)

        # Check for "Code XXXX" display issues
        code_issues = []
        for v in report.recent_violations:
            name = v.contaminant_name or ""
            if name.startswith("Code ") or name == "" or name.startswith("Unknown"):
                code_issues.append(name or "(empty)")

        # Check if violations have dates
        dated = sum(1 for v in report.recent_violations if v.compliance_begin_date)
        undated = len(report.recent_violations) - dated

        # County from first system
        county = ""
        if report.water_systems and report.water_systems[0].counties_served:
            county = report.water_systems[0].counties_served.split(",")[0].strip()

        results.append({
            "zip": zip_code,
            "status": "OK",
            "population": report.total_population_served,
            "systems": len(report.water_systems),
            "risk": report.overall_risk_level,
            "violations_3yr": total_violations,
            "health_violations": total_health,
            "has_contaminant_names": "NO" if code_issues else "YES",
            "violation_detail_count": len(report.recent_violations),
            "dated_violations": dated,
            "undated_violations": undated,
            "contaminant_code_issues": "; ".join(code_issues[:5]),
            "county": county,
            "top_contaminants": len(report.top_contaminants),
        })

        if (i + 1) % 20 == 0:
            logger.info(f"  Tested {i + 1}/{total} ZIP codes...")

    db.close()

    # ── Summary Statistics ──
    print("\n" + "=" * 80)
    print("TAPTHAT TEST RESULTS — 200 TEXAS ZIP CODES")
    print("=" * 80)
    print(f"\nTotal tested: {total}")
    print(f"Found:        {found}")
    print(f"Not found:    {not_found}")

    ok_results = [r for r in results if r["status"] == "OK"]

    # Risk distribution
    risk_counts = {"safe": 0, "caution": 0, "danger": 0}
    for r in ok_results:
        risk_counts[r["risk"]] += 1
    print(f"\nRisk distribution:")
    print(f"  Safe:    {risk_counts['safe']}")
    print(f"  Caution: {risk_counts['caution']}")
    print(f"  Danger:  {risk_counts['danger']}")

    # Population ranges
    pops = [r["population"] for r in ok_results]
    if pops:
        print(f"\nPopulation served:")
        print(f"  Min:     {min(pops):,}")
        print(f"  Max:     {max(pops):,}")
        print(f"  Median:  {sorted(pops)[len(pops)//2]:,}")
        print(f"  Zeros:   {sum(1 for p in pops if p == 0)}")

    # Contaminant name issues
    code_issue_count = sum(1 for r in ok_results if r["has_contaminant_names"] == "NO")
    print(f"\nContaminant name issues:")
    print(f"  ZIPs with 'Code XXXX' or empty names: {code_issue_count}/{found}")
    if code_issue_count > 0:
        print("  Examples:")
        for r in [x for x in ok_results if x["has_contaminant_names"] == "NO"][:10]:
            print(f"    ZIP {r['zip']}: {r['contaminant_code_issues']}")

    # Violation coverage
    with_violations = sum(1 for r in ok_results if r["violations_3yr"] > 0)
    with_health = sum(1 for r in ok_results if r["health_violations"] > 0)
    print(f"\nViolation coverage:")
    print(f"  ZIPs with violations (3yr): {with_violations}/{found}")
    print(f"  ZIPs with health violations: {with_health}/{found}")

    # Date coverage
    total_dated = sum(r.get("dated_violations", 0) for r in ok_results)
    total_undated = sum(r.get("undated_violations", 0) for r in ok_results)
    print(f"  Violations with dates: {total_dated}")
    print(f"  Violations without dates: {total_undated}")

    # ── Detailed table ──
    print("\n" + "=" * 80)
    print("DETAILED RESULTS")
    print("=" * 80)
    print(f"{'ZIP':<8} {'Status':<10} {'Risk':<8} {'Pop':>12} {'Sys':>5} {'Viol':>6} {'Health':>7} {'Names':>6} {'County':<20}")
    print("-" * 92)
    for r in results:
        print(
            f"{r['zip']:<8} "
            f"{r['status']:<10} "
            f"{r['risk']:<8} "
            f"{r['population']:>12,} "
            f"{r['systems']:>5} "
            f"{r['violations_3yr']:>6} "
            f"{r.get('health_violations', 0):>7} "
            f"{r['has_contaminant_names']:>6} "
            f"{r['county']:<20}"
        )

    # ── County cross-check ──
    print("\n" + "=" * 80)
    print("COUNTY-LEVEL CROSS CHECK (Top 20 by population)")
    print("=" * 80)
    print(f"{'County':<20} {'Risk':<10} {'Systems':>8} {'Pop':>14} {'Violations':>11}")
    print("-" * 70)
    for cr in county_risks[:20]:
        print(
            f"{cr['county']:<20} "
            f"{cr['risk_level']:<10} "
            f"{cr['system_count']:>8} "
            f"{cr['population']:>14,} "
            f"{cr['violation_count']:>11}"
        )

    # ── Known issues ──
    print("\n" + "=" * 80)
    print("ISSUES FOUND")
    print("=" * 80)

    issues = []
    # Check for zero-population ZIPs that should have people
    for r in ok_results:
        if r["population"] == 0 and r["systems"] > 0:
            issues.append(f"ZIP {r['zip']}: {r['systems']} systems but 0 population")

    # Check for unreasonably high populations
    for r in ok_results:
        if r["population"] > 10_000_000:
            issues.append(f"ZIP {r['zip']}: suspiciously high population ({r['population']:,})")

    # Check for ZIPs that should exist but don't
    if not_found > 0:
        nf_zips = [r["zip"] for r in results if r["status"] == "NOT_FOUND"]
        issues.append(f"{not_found} ZIPs not found: {', '.join(nf_zips[:20])}")

    if issues:
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("  No critical issues found!")


if __name__ == "__main__":
    run_tests()
