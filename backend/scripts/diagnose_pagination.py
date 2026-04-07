"""
Diagnose whether SDWIS Envirofacts offset pagination truncates large states.

Compares:
  - ECHO's reported total (ground truth from get_systems / per-system QueryRows)
  - SDWIS Envirofacts paginated row count for violations + geographic_areas

Probes high offsets directly to detect a hard cap (the suspected ~10k Envirofacts
soft limit) without ingesting anything.

Run:  cd backend && python -m scripts.diagnose_pagination CA
      cd backend && python -m scripts.diagnose_pagination CA NY FL TX
Default states: CA NY FL TX  (the four most likely to truncate)
"""

import sys
import time
import logging
import httpx

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
log = logging.getLogger(__name__)

ECHO_BASE = "https://echodata.epa.gov/echo/sdw_rest_services"
SDWIS_BASE = "https://data.epa.gov/efservice"

client = httpx.Client(timeout=120.0)


def fetch(url, params=None):
    for attempt in range(3):
        try:
            r = client.get(url, params=params)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            log.warning(f"  retry {attempt+1}: {e}")
            time.sleep(2 ** attempt)
    return None


def echo_violation_total(state):
    """Use ECHO get_systems to get authoritative violation total for the state."""
    data = fetch(
        f"{ECHO_BASE}.get_systems",
        params={"p_st": state, "p_ptype": "CWS", "p_act": "A", "output": "JSON"},
    )
    if not data:
        return None
    return int(data.get("Results", {}).get("QueryRows", 0))


def sdwis_count(table, state):
    """Ask Envirofacts for COUNT only — cheap, no row payload."""
    url = f"{SDWIS_BASE}/{table}/primacy_agency_code/equals/{state}/COUNT/json"
    data = fetch(url)
    if not data:
        return None
    # Envirofacts returns [{"TOTALQUERYRESULTS": "12345"}] for COUNT
    if isinstance(data, list) and data:
        for k, v in data[0].items():
            if "TOTAL" in k.upper() or "COUNT" in k.upper():
                try:
                    return int(v)
                except (ValueError, TypeError):
                    pass
    return None


def probe_offset(table, state, offset, batch=100):
    """Fetch a small window starting at `offset` and return how many rows came back."""
    end = offset + batch - 1
    url = f"{SDWIS_BASE}/{table}/primacy_agency_code/equals/{state}/{offset}:{end}/json"
    data = fetch(url)
    if data is None:
        return -1  # error
    if isinstance(data, list):
        return len(data)
    return 0


def diagnose_state(state):
    print(f"\n{'='*60}\n{state}\n{'='*60}")

    echo_systems = echo_violation_total(state)
    print(f"ECHO active CWS count:       {echo_systems}")

    for table in ("sdwis.violation", "sdwis.geographic_area", "sdwis.lcr_sample_result"):
        print(f"\n[{table}]")
        total = sdwis_count(table, state)
        print(f"  SDWIS COUNT endpoint:      {total}")

        # Probe escalating offsets to detect a hard ceiling
        probes = [1, 1000, 5000, 9900, 10000, 10001, 25000, 50000, 100000]
        if total and total < max(probes):
            probes = [p for p in probes if p <= total + 1000]
        for off in probes:
            n = probe_offset(table, state, off)
            marker = " <-- EMPTY" if n == 0 else (" <-- ERROR" if n < 0 else "")
            print(f"  offset {off:>7}: returned {n:>4} rows{marker}")
            time.sleep(0.3)


def main():
    states = [s.upper() for s in sys.argv[1:]] or ["CA", "NY", "FL", "TX"]
    for s in states:
        diagnose_state(s)
    client.close()


if __name__ == "__main__":
    main()
