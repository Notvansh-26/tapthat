"""
Fix risk levels: Recalculate violation_count_3yr and health_violation_count_3yr
from actual violations table data instead of ECHO's zeroed-out fields.

Also updates contaminant_name for violations that only have raw codes.

Run: cd backend && python -m scripts.fix_risk_levels
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path

from sqlalchemy import text
from app.database import engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ── Load official EPA contaminant codes from reference file ──────────────────
# Source: EPA SDWA_REF_CODE_VALUES.csv (from ECHO bulk download)
_ref_path = Path(__file__).resolve().parent.parent / "app" / "data" / "epa_contaminant_codes.json"
with open(_ref_path) as f:
    CONTAMINANT_CODES = json.load(f)
logger.info(f"Loaded {len(CONTAMINANT_CODES)} EPA contaminant codes from reference file")

# Legacy hardcoded dict kept for backwards compat reference only
_LEGACY_CODES = {
    # Inorganics (IOCs)
    "1005": "Arsenic",
    "1006": "Asbestos",
    "1007": "Cadmium",
    "1008": "Chromium",
    "1009": "Mercury",
    "1010": "Barium",
    "1011": "Antimony",
    "1012": "Beryllium",
    "1013": "Cyanide",
    "1015": "Selenium",
    "1016": "Thallium",
    "1017": "Combined Uranium",
    "1018": "Gross Alpha (excl. Radon & Uranium)",
    "1020": "Combined Radium (-226 & -228)",
    "1022": "Radium-226",
    "1023": "Radium-228",
    "1024": "Fluoride",
    "1025": "Nickel",
    "1026": "Sodium",
    "1028": "Sulfate",
    "1030": "Nitrate",
    "1035": "Nitrite",
    "1036": "Nitrate-Nitrite",
    "1038": "Lead",
    "1040": "Copper",
    "1041": "Gross Beta Particle Activity",
    "1042": "Strontium-90",
    "1043": "Tritium",
    "1044": "Uranium (mass)",

    # Volatile Organic Compounds (VOCs)
    "2010": "Benzene",
    "2015": "Carbon Tetrachloride",
    "2020": "Chlorobenzene",
    "2021": "o-Dichlorobenzene",
    "2022": "p-Dichlorobenzene",
    "2023": "1,2-Dichlorobenzene",
    "2024": "1,2-Dichloroethane",
    "2025": "Methylene Chloride",
    "2026": "cis-1,2-Dichloroethylene",
    "2027": "trans-1,2-Dichloroethylene",
    "2029": "1,1-Dichloroethylene",
    "2030": "1,2-Dichloropropane",
    "2031": "Ethylbenzene",
    "2032": "Styrene",
    "2034": "Tetrachloroethylene",
    "2036": "Toluene",
    "2037": "1,2,4-Trichlorobenzene",
    "2039": "Total Coliform",
    "2040": "1,1,1-Trichloroethane",
    "2041": "1,1,2-Trichloroethane",
    "2042": "Trichloroethylene",
    "2043": "Vinyl Chloride",
    "2044": "Xylenes (Total)",
    "2045": "Dichloromethane",
    "2046": "1,2-Dichloroethane",
    "2050": "Total Haloacetic Acids (HAA5)",
    "2051": "Monochloroacetic Acid",
    "2052": "Dichloroacetic Acid",
    "2053": "Trichloroacetic Acid",
    "2054": "Monobromoacetic Acid",
    "2055": "Dibromoacetic Acid",
    "2056": "Bromochloroacetic Acid",
    "2065": "Total Trihalomethanes (TTHM)",
    "2066": "Bromodichloromethane",
    "2067": "Dibromochloromethane",
    "2068": "Bromoform",
    "2069": "Chloroform",
    "2076": "Chlorite",
    "2077": "Bromate",
    "2078": "Chlorine Dioxide",
    "2080": "MTBE",
    "2090": "Total Organic Carbon",
    "2091": "SUVA (Specific UV Absorbance)",

    # Synthetic Organic Compounds (SOCs)
    "2100": "2,4-D",
    "2101": "2,4,5-TP (Silvex)",
    "2102": "Alachlor",
    "2103": "Atrazine",
    "2104": "Carbofuran",
    "2105": "Chlordane",
    "2106": "Dalapon",
    "2107": "Di(2-ethylhexyl)adipate",
    "2108": "Di(2-ethylhexyl)phthalate",
    "2109": "Dibromochloropropane (DBCP)",
    "2110": "Dinoseb",
    "2111": "Dioxin (2,3,7,8-TCDD)",
    "2112": "Diquat",
    "2113": "Endothall",
    "2114": "Endrin",
    "2115": "Ethylene Dibromide (EDB)",
    "2116": "Glyphosate",
    "2117": "Heptachlor",
    "2118": "Heptachlor Epoxide",
    "2119": "Hexachlorobenzene",
    "2120": "Hexachlorocyclopentadiene",
    "2121": "Lindane",
    "2122": "Methoxychlor",
    "2123": "Oxamyl (Vydate)",
    "2124": "PCBs (Polychlorinated Biphenyls)",
    "2125": "Pentachlorophenol",
    "2126": "Picloram",
    "2127": "Simazine",
    "2128": "Toxaphene",
    "2129": "Benzo(a)pyrene",
    "2130": "Total PAHs",

    # Microbiological
    "2900": "Turbidity",
    "2901": "E. coli",
    "2902": "Fecal Coliform",
    "2903": "Heterotrophic Plate Count",
    "2905": "Total Coliform (RTCR)",
    "2906": "E. coli (RTCR)",
    "2909": "Legionella",
    "2910": "Giardia Lamblia",
    "2911": "Cryptosporidium",
    "2915": "Viruses",

    # Disinfectants and Treatment Technique
    "0100": "Turbidity",
    "0200": "Surface Water Treatment Rule",
    "0300": "Filter Backwash Recycling Rule",
    "0400": "Long Term 1 Enhanced SWTR",
    "0500": "Long Term 2 Enhanced SWTR",
    "0600": "Ground Water Rule",
    "0700": "Aircraft Drinking Water Rule",
    "0800": "Revised Total Coliform Rule",
    "0999": "Chlorine/Chloramine Residual",

    # Lead and Copper Rule
    "1038": "Lead",
    "1040": "Copper",

    # Rule/Reporting codes (these show up as contaminant codes in violations)
    "1000": "Inorganic Chemicals (IOC) Rule",
    "2000": "Volatile Organic Chemicals (VOC) Rule",
    "2300": "Synthetic Organic Chemicals (SOC) Rule",
    "2400": "Unregulated Contaminant Monitoring Rule (UCMR)",
    "2500": "Consumer Confidence Report Rule",
    "2600": "Public Notification Rule",
    "2700": "Recordkeeping/Reporting Rule",
    "2800": "Other Monitoring Rule",
    "2950": "Disinfection Byproducts Rule",
    "2985": "Stage 1 D/DBPR",
    "2990": "Stage 2 D/DBPR",
    "3000": "Total Coliform Rule",
    "3001": "Total Coliform (TCR)",
    "3002": "Fecal Coliform/E. coli (TCR)",
    "3003": "Fecal Indicator (TCR)",
    "3013": "E. coli (RTCR)",
    "3014": "Total Coliform (RTCR)",
    "3100": "Revised Total Coliform Rule",

    # Treatment technique / admin codes
    "4000": "Treatment Technique Rule",
    "4002": "Treatment Technique Violation",
    "4010": "SWTR Treatment Technique",
    "4100": "Lead and Copper Rule",

    # Reporting / admin violation codes
    "5000": "Monitoring & Reporting (M/R) Violation",
    "5001": "IOC Monitoring Violation",
    "5002": "VOC Monitoring Violation",
    "5003": "SOC Monitoring Violation",
    "5004": "Radiological Monitoring Violation",
    "5100": "SWTR Monitoring Violation",
    "5200": "D/DBPR Monitoring Violation",
    "5300": "Lead & Copper Monitoring Violation",
    "5400": "Coliform Monitoring Violation",
    "5500": "RTCR Monitoring Violation",

    # Administrative / operational
    "6000": "Operations & Maintenance Violation",
    "7000": "Public Notice Violation",
    "7001": "Tier 1 Public Notice Violation",
    "7002": "Tier 2 Public Notice Violation",
    "7003": "Tier 3 Public Notice Violation",
}  # end _LEGACY_CODES (unused, kept for reference)


def fix_violation_counts():
    """Recalculate violation_count_3yr and health_violation_count_3yr from violations table."""
    logger.info("Recalculating violation counts from violations table...")

    three_years_ago = datetime.now(timezone.utc) - timedelta(days=3 * 365)

    with engine.connect() as conn:
        # Count total violations per system in last 3 years
        result = conn.execute(text("""
            UPDATE water_systems ws SET
                violation_count_3yr = sub.total_violations,
                health_violation_count_3yr = sub.health_violations
            FROM (
                SELECT
                    pwsid,
                    COUNT(*) AS total_violations,
                    COUNT(*) FILTER (WHERE is_health_based = true) AS health_violations
                FROM violations
                WHERE compliance_begin_date >= :cutoff
                   OR compliance_begin_date IS NULL
                GROUP BY pwsid
            ) sub
            WHERE ws.pwsid = sub.pwsid
        """), {"cutoff": three_years_ago})

        updated = result.rowcount
        conn.commit()
        logger.info(f"Updated violation counts for {updated} water systems")

        # Also check: systems with violations that have NO date
        # (include them since we can't confirm they're old)
        # Already handled above with OR compliance_begin_date IS NULL

        # Verify: count systems by risk level
        for level_query, label in [
            ("violation_count_3yr = 0 AND health_violation_count_3yr = 0 AND (serious_violator = false OR serious_violator IS NULL)", "safe"),
            ("violation_count_3yr > 0 OR health_violation_count_3yr > 0", "caution+"),
            ("health_violation_count_3yr >= 3 OR serious_violator = true", "danger"),
        ]:
            row = conn.execute(text(f"SELECT COUNT(*) FROM water_systems WHERE {level_query}")).fetchone()
            logger.info(f"  {label}: {row[0]} systems")


def fix_contaminant_names():
    """Update violation rows that have raw contaminant codes instead of readable names."""
    logger.info("Fixing contaminant names in violations table...")

    with engine.connect() as conn:
        # Find all distinct contaminant_codes that have NULL or 'Code XXXX' names
        result = conn.execute(text("""
            SELECT DISTINCT contaminant_code
            FROM violations
            WHERE contaminant_code IS NOT NULL
              AND (contaminant_name IS NULL OR contaminant_name LIKE 'Code %' OR contaminant_name = '')
        """))
        codes_to_fix = [r[0] for r in result]
        logger.info(f"Found {len(codes_to_fix)} contaminant codes needing name updates")

        total_updated = 0
        for code in codes_to_fix:
            code_stripped = code.strip()
            name = CONTAMINANT_CODES.get(code_stripped)
            if not name:
                # Try without leading zeros
                name = CONTAMINANT_CODES.get(code_stripped.lstrip("0"))
            if not name:
                logger.warning(f"  No mapping for code '{code_stripped}'")
                continue

            result = conn.execute(
                text("""
                    UPDATE violations
                    SET contaminant_name = :name
                    WHERE contaminant_code = :code
                      AND (contaminant_name IS NULL OR contaminant_name LIKE 'Code %' OR contaminant_name = '')
                """),
                {"name": name, "code": code},
            )
            total_updated += result.rowcount

        conn.commit()
        logger.info(f"Updated contaminant names for {total_updated} violation rows")

        # Show remaining unmapped
        result = conn.execute(text("""
            SELECT contaminant_code, COUNT(*) as cnt
            FROM violations
            WHERE contaminant_name IS NULL OR contaminant_name = ''
            GROUP BY contaminant_code
            ORDER BY cnt DESC
            LIMIT 20
        """))
        remaining = result.fetchall()
        if remaining:
            logger.info("Remaining unmapped codes:")
            for code, cnt in remaining:
                logger.info(f"  {code}: {cnt} violations")


def update_ingestion_contaminant_lookup():
    """Also fix contaminant_name for existing violations that have names from old lookup."""
    logger.info("Updating all violations with enriched contaminant names...")

    with engine.connect() as conn:
        total = 0
        for code, name in CONTAMINANT_CODES.items():
            # Update where code matches but name is missing or generic
            result = conn.execute(
                text("""
                    UPDATE violations
                    SET contaminant_name = :name
                    WHERE contaminant_code = :code
                      AND (contaminant_name IS NULL OR contaminant_name = '' OR contaminant_name LIKE 'Unknown%')
                """),
                {"name": name, "code": code},
            )
            total += result.rowcount

        conn.commit()
        logger.info(f"Enriched names for {total} violation rows")


if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("TapThat — Fix Risk Levels & Contaminant Names")
    logger.info("=" * 60)

    fix_violation_counts()
    fix_contaminant_names()
    update_ingestion_contaminant_lookup()

    logger.info("=" * 60)
    logger.info("Done! Risk levels and contaminant names fixed.")
    logger.info("=" * 60)
