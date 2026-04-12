"""
Targeted violation patch for specific PWSID prefixes that failed during ingestion.

Usage:
    python -u -m scripts.patch_prefix_violations > /tmp/patch_log.txt 2>&1 &

Prefixes patched:
  NC03, NC04  — All retries failed during job3 (2026-04-10)
  WV5         — All retries failed during job3 (2026-04-10)

Strategy:
  1. Delete existing violations for each prefix (so re-insert is clean)
  2. Fetch from SDWIS Envirofacts for that prefix only (reusing chunked logic)
  3. Insert with same field mapping as ingest_violations()
"""

import json
import logging
import time
from pathlib import Path

import httpx
from sqlalchemy import text

from app.database import engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

_ref_path = Path(__file__).resolve().parent.parent / "app" / "data" / "epa_contaminant_codes.json"
with open(_ref_path) as f:
    EPA_CONTAMINANT_CODES = json.load(f)

SDWIS_BASE = "https://data.epa.gov/efservice"
BATCH_SIZE = 1000
OVERFLOW_THRESHOLD = 9000
MAX_DEPTH = 6
MAX_RETRIES = 3

# (state_code, prefix) pairs to patch
TARGETS = [
    ("NC", "NC03"),
    ("NC", "NC04"),
    ("WV", "WV5"),
]


def _get_contaminant_name(code):
    if not code:
        return None
    return EPA_CONTAMINANT_CODES.get(str(code))


def _parse_date(val):
    if not val:
        return None
    for fmt in ("%m/%d/%Y", "%Y-%m-%d"):
        try:
            from datetime import datetime
            return datetime.strptime(val, fmt).date()
        except Exception:
            pass
    return None


def fetch_with_retry(url: str):
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = httpx.get(url, timeout=60)
            if resp.status_code == 200:
                data = resp.json()
                return data if isinstance(data, list) else []
            logger.warning(f"  HTTP {resp.status_code} on attempt {attempt}: {url}")
        except Exception as e:
            logger.warning(f"  Exception on attempt {attempt}: {e}")
        if attempt < MAX_RETRIES:
            time.sleep(5 * attempt)
    logger.error(f"  All retries failed: {url}")
    return []


def fetch_prefix(state_code: str, prefix: str, depth: int):
    """Recursively fetch violations for a specific PWSID prefix."""
    bucket = []
    offset = 1
    overflowed = False
    while True:
        end = offset + BATCH_SIZE - 1
        url = (
            f"{SDWIS_BASE}/sdwis.violation"
            f"/primacy_agency_code/equals/{state_code}"
            f"/pwsid/beginswith/{prefix}"
            f"/{offset}:{end}/json"
        )
        data = fetch_with_retry(url)
        if not data:
            break
        bucket.extend(data)
        if len(data) < BATCH_SIZE:
            break
        if len(bucket) >= OVERFLOW_THRESHOLD and depth < MAX_DEPTH:
            overflowed = True
            break
        offset += BATCH_SIZE
        time.sleep(0.2)

    if overflowed:
        logger.warning(f"  prefix {prefix} hit {len(bucket)} rows — splitting deeper")
        for d in "0123456789":
            yield from fetch_prefix(state_code, prefix + d, depth + 1)
    else:
        yield from bucket


def patch_prefix(conn, state_code: str, prefix: str, known_pwsids: set):
    logger.info(f"--- Patching {prefix} (state={state_code}) ---")

    # Delete existing violations for this prefix
    deleted = conn.execute(
        text("DELETE FROM violations WHERE pwsid LIKE :pat"),
        {"pat": f"{prefix}%"},
    )
    conn.commit()
    logger.info(f"  Deleted {deleted.rowcount} existing violations for {prefix}%")

    # Fetch and re-insert
    rows = []
    total = 0
    skipped = 0

    def flush():
        nonlocal rows, total
        if not rows:
            return
        conn.execute(
            text("""
                INSERT INTO violations (pwsid, violation_id, contaminant_code, contaminant_name,
                    rule_name, violation_type, severity, is_health_based,
                    compliance_begin_date, compliance_end_date, enforcement_action)
                VALUES (:pwsid, :violation_id, :contaminant_code, :contaminant_name,
                    :rule_name, :violation_type, :severity, :is_health_based,
                    :compliance_begin_date, :compliance_end_date, :enforcement_action)
            """),
            rows,
        )
        conn.commit()
        total += len(rows)
        rows = []
        logger.info(f"  {total} violations inserted ({skipped} skipped)")

    for row in fetch_prefix(state_code, prefix, depth=len(prefix) - len(state_code)):
        pwsid = (row.get("pwsid") or "").strip()
        if pwsid not in known_pwsids:
            skipped += 1
            continue
        rows.append({
            "pwsid": pwsid,
            "violation_id": row.get("violation_id"),
            "contaminant_code": row.get("contaminant_code"),
            "contaminant_name": _get_contaminant_name(row.get("contaminant_code")),
            "rule_name": row.get("rule_name"),
            "violation_type": row.get("violation_type"),
            "severity": row.get("severity"),
            "is_health_based": row.get("is_health_based_ind", "N") == "Y",
            "compliance_begin_date": _parse_date(row.get("compl_per_begin_date")),
            "compliance_end_date": _parse_date(row.get("compl_per_end_date")),
            "enforcement_action": row.get("enforcement_action"),
        })
        if len(rows) >= 1000:
            flush()
    flush()

    logger.info(f"  {prefix} DONE: {total} inserted, {skipped} orphans skipped")
    return total


def main():
    with engine.connect() as conn:
        logger.info("Loading known PWS IDs...")
        result = conn.execute(text("SELECT pwsid FROM water_systems"))
        known_pwsids = {r[0] for r in result}
        logger.info(f"  {len(known_pwsids)} known systems")

        grand_total = 0
        for state_code, prefix in TARGETS:
            n = patch_prefix(conn, state_code, prefix, known_pwsids)
            grand_total += n

        logger.info(f"\n=== ALL PREFIXES DONE: {grand_total} violations inserted ===")

    logger.info("Running fix_risk_levels to recalculate counts...")
    from scripts.fix_risk_levels import fix_violation_counts, fix_contaminant_names
    fix_violation_counts()
    fix_contaminant_names()
    logger.info("fix_risk_levels complete.")


if __name__ == "__main__":
    main()
