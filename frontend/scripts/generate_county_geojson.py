"""
Download US county boundaries from Census Bureau and split into per-state GeoJSON files.

Output: public/geojson/{state_code}-counties.geojson for each state

Source: US Census Bureau cartographic boundary files (500k resolution - good balance of
detail and file size)
"""

import json
import os
import sys
import urllib.request
import zipfile
import io

# Census Bureau 500k county boundaries (cartographic, ~13MB zip)
COUNTY_URL = "https://www2.census.gov/geo/tiger/GENZ2022/shp/cb_2022_us_county_500k.zip"

# FIPS state code -> postal code mapping
FIPS_TO_STATE = {
    "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
    "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
    "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
    "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
    "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
    "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
    "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
    "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
    "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
    "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
    "56": "WY", "72": "PR", "78": "VI", "66": "GU", "69": "MP",
    "60": "AS",
}

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "geojson")


def download_and_convert():
    """
    Strategy: Use the pre-converted GeoJSON from the Census Bureau's
    cartographic boundary files. We'll use a GeoJSON source directly
    to avoid needing shapefile libraries.
    """
    # Use a pre-converted GeoJSON source (Eric Celeste / US Atlas)
    # This is a well-known public dataset derived from Census Bureau data
    geojson_url = "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json"

    print(f"Downloading US counties GeoJSON...")
    req = urllib.request.Request(geojson_url, headers={"User-Agent": "TapThat/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    print(f"Downloaded {len(data['features'])} county features")

    # Group features by state FIPS code
    by_state = {}
    for feature in data["features"]:
        fips = feature.get("id", "")
        if len(fips) < 4:
            continue
        state_fips = fips[:2]
        state_code = FIPS_TO_STATE.get(state_fips)
        if not state_code:
            continue
        if state_code not in by_state:
            by_state[state_code] = []
        by_state[state_code].append(feature)

    print(f"Found counties for {len(by_state)} states")

    # Problem: this dataset uses FIPS IDs but may not have NAME property
    # We need to add county names. Let's check the first feature.
    sample = data["features"][0]
    props = sample.get("properties", {})
    print(f"Sample properties: {props}")
    print(f"Sample id: {sample.get('id')}")

    # If no NAME, we need a name lookup. Let's try another source.
    if "NAME" not in props:
        print("No NAME property found. Trying Census Bureau GeoJSON directly...")
        return download_census_geojson()

    # Write per-state files
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for state_code, features in sorted(by_state.items()):
        filename = f"{state_code.lower()}-counties.geojson"
        filepath = os.path.join(OUTPUT_DIR, filename)
        geojson = {
            "type": "FeatureCollection",
            "features": features,
        }
        with open(filepath, "w") as f:
            json.dump(geojson, f, separators=(",", ":"))
        size_kb = os.path.getsize(filepath) / 1024
        print(f"  {filename}: {len(features)} counties, {size_kb:.0f} KB")

    print(f"\nDone! Generated {len(by_state)} state county files in {OUTPUT_DIR}")


def download_census_geojson():
    """
    Alternative: Download from Census Bureau's cartographic boundary API
    which provides GeoJSON directly with NAME properties.
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    base_url = "https://raw.githubusercontent.com/deldersveld/topojson/master/countries/us-states"

    # Use the Census Bureau's direct GeoJSON API instead
    # cb_2022_us_county_500k has NAME property
    census_url = "https://www2.census.gov/geo/tiger/GENZ2022/shp/cb_2022_us_county_500k.zip"

    print("Downloading Census Bureau county shapefile...")
    print("(This requires the 'shapefile' library. Trying alternative approach...)")

    # Best alternative: use a GeoJSON that has county names
    # The Natural Earth / Census-derived dataset from topojson/us-atlas
    alt_url = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json"

    print(f"Downloading TopoJSON from us-atlas...")
    req = urllib.request.Request(alt_url, headers={"User-Agent": "TapThat/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        topo_data = json.loads(resp.read().decode("utf-8"))

    # We need to convert TopoJSON to GeoJSON - this requires topojson library
    # Let's take yet another approach: use the plotly dataset but add names from a lookup

    print("Building county FIPS-to-name lookup...")
    # Download county FIPS lookup from Census
    fips_url = "https://raw.githubusercontent.com/kjhealy/fips-codes/master/state_and_county_fips_master.csv"
    req = urllib.request.Request(fips_url, headers={"User-Agent": "TapThat/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        csv_text = resp.read().decode("utf-8")

    # Parse CSV: fips,name,state
    fips_to_name = {}
    for line in csv_text.strip().split("\n")[1:]:
        parts = line.split(",")
        if len(parts) >= 3:
            fips = parts[0].strip().zfill(5)
            name = parts[1].strip().strip('"')
            # Remove " County", " Parish", etc. suffix to match API data
            for suffix in [" County", " Parish", " Borough", " Census Area",
                          " Municipality", " city", " City and Borough",
                          " Municipio"]:
                if name.endswith(suffix):
                    name = name[:-len(suffix)]
                    break
            fips_to_name[fips] = name

    print(f"Loaded {len(fips_to_name)} county names")

    # Now re-download the plotly GeoJSON and add names
    geojson_url = "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json"
    print(f"Re-downloading counties GeoJSON...")
    req = urllib.request.Request(geojson_url, headers={"User-Agent": "TapThat/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    # Enrich features with NAME and group by state
    by_state = {}
    missing_names = 0
    for feature in data["features"]:
        fips = feature.get("id", "")
        if len(fips) < 4:
            continue

        state_fips = fips[:2]
        state_code = FIPS_TO_STATE.get(state_fips)
        if not state_code:
            continue

        # Add NAME property
        name = fips_to_name.get(fips.zfill(5))
        if name:
            if "properties" not in feature:
                feature["properties"] = {}
            feature["properties"]["NAME"] = name
            feature["properties"]["STATE"] = state_fips
            feature["properties"]["GEO_ID"] = f"0500000US{fips.zfill(5)}"
        else:
            missing_names += 1
            continue  # Skip counties without names

        if state_code not in by_state:
            by_state[state_code] = []
        by_state[state_code].append(feature)

    if missing_names:
        print(f"Warning: {missing_names} counties without name mapping (skipped)")

    # Write per-state files
    total_size = 0
    for state_code, features in sorted(by_state.items()):
        filename = f"{state_code.lower()}-counties.geojson"
        filepath = os.path.join(OUTPUT_DIR, filename)

        # Skip TX - we already have a good file
        if state_code == "TX" and os.path.exists(filepath):
            print(f"  {filename}: SKIPPED (already exists)")
            continue

        geojson = {
            "type": "FeatureCollection",
            "features": features,
        }
        with open(filepath, "w") as f:
            json.dump(geojson, f, separators=(",", ":"))
        size_kb = os.path.getsize(filepath) / 1024
        total_size += size_kb
        print(f"  {filename}: {len(features)} counties, {size_kb:.0f} KB")

    print(f"\nDone! Generated {len(by_state)} state files, {total_size/1024:.1f} MB total")


if __name__ == "__main__":
    download_and_convert()
