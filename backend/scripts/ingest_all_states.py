"""
Full US ingestion pipeline — ingest all states then fix risk levels.

Usage: python -u -m scripts.ingest_all_states
       python -u -m scripts.ingest_all_states CA NY FL   (specific states)
       python -u -m scripts.ingest_all_states --remaining (skip states already in DB)
"""

import sys
import logging
from sqlalchemy import text
from app.database import engine, Base
from app.models import WaterSystem, Violation, ContaminantResult, GeographicArea

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# Force flush on every log
for h in logger.handlers:
    h.flush = lambda: sys.stdout.flush()

from scripts.ingest_epa_data import (
    ALL_STATES,
    ingest_water_systems,
    ingest_geographic_areas,
    ingest_violations,
    ingest_lcr_samples,
    client,
)
from scripts.fix_risk_levels import fix_violation_counts, fix_contaminant_names


def get_ingested_states():
    """Check which states already have full data."""
    with engine.connect() as conn:
        # States with water systems
        r = conn.execute(text("""
            SELECT state_code, COUNT(*) as systems
            FROM water_systems
            WHERE activity_status = 'Active'
            GROUP BY state_code
        """))
        system_states = {row[0]: row[1] for row in r}

        # States with geographic areas
        r = conn.execute(text("""
            SELECT state_code, COUNT(DISTINCT zip_code) as zips
            FROM geographic_areas
            GROUP BY state_code
        """))
        geo_states = {row[0]: row[1] for row in r}

        # States with violations
        r = conn.execute(text("""
            SELECT LEFT(pwsid, 2) as st, COUNT(*) as viols
            FROM violations
            GROUP BY LEFT(pwsid, 2)
        """))
        viol_states = {row[0]: row[1] for row in r}

        return system_states, geo_states, viol_states


def ingest_state_complete(conn, state_code: str, skip_existing: bool = True):
    """Ingest all data for a state, skipping steps that already have data."""
    logger.info(f"=== {state_code} ===")

    sys_states, geo_states, viol_states = get_ingested_states()

    # Systems
    if skip_existing and sys_states.get(state_code, 0) > 100:
        logger.info(f"  Systems: SKIP ({sys_states[state_code]} already exist)")
    else:
        ingest_water_systems(conn, state_code)

    # Geographic areas (ZIP mappings)
    if skip_existing and geo_states.get(state_code, 0) > 50:
        logger.info(f"  Geographic areas: SKIP ({geo_states[state_code]} ZIPs already exist)")
    else:
        ingest_geographic_areas(conn, state_code)

    # Violations
    if skip_existing and viol_states.get(state_code, 0) > 100:
        logger.info(f"  Violations: SKIP ({viol_states[state_code]} already exist)")
    else:
        ingest_violations(conn, state_code)

    # LCR samples (always relatively small)
    ingest_lcr_samples(conn, state_code)

    logger.info(f"=== {state_code} DONE ===\n")


def main():
    import time

    args = sys.argv[1:]

    if "--remaining" in args:
        sys_states, geo_states, _ = get_ingested_states()
        # States that have systems AND geo areas are "done"
        done = {s for s in sys_states if s in geo_states and geo_states[s] > 50}
        # Only do 50 states + DC + PR (skip small territories for now)
        target_states = [s for s in ALL_STATES[:52] if s not in done]
        logger.info(f"Already done: {sorted(done)}")
        logger.info(f"Remaining: {len(target_states)} states")
    elif args:
        target_states = [s.upper() for s in args if s != "--remaining"]
    else:
        target_states = ALL_STATES[:52]  # 50 states + DC + PR

    logger.info(f"Ingesting {len(target_states)} states: {', '.join(target_states)}")

    Base.metadata.create_all(bind=engine)

    with engine.connect() as conn:
        for i, state_code in enumerate(target_states, 1):
            logger.info(f"\n[{i}/{len(target_states)}] {state_code}")
            try:
                ingest_state_complete(conn, state_code)
            except Exception as e:
                logger.error(f"FAILED {state_code}: {e}")
                import traceback
                traceback.print_exc()
                continue
            if len(target_states) > 1:
                time.sleep(1)

    # Fix risk levels from violations table (ECHO API returns zeros)
    logger.info("\n" + "=" * 60)
    logger.info("Fixing risk levels from violations table...")
    fix_violation_counts()
    fix_contaminant_names()

    logger.info("=" * 60)
    logger.info("ALL DONE!")
    logger.info("=" * 60)
    client.close()


if __name__ == "__main__":
    main()
