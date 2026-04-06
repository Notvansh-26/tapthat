from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.water import ZipCodeReport, ComparisonReport, WaterSystemSummary
from app.services.water_service import WaterService

router = APIRouter(prefix="/api", tags=["water"])


@router.get("/search/{zip_code}", response_model=ZipCodeReport)
def get_water_report(zip_code: str, db: Session = Depends(get_db)):
    """Get water quality report for any US ZIP code."""
    service = WaterService(db)
    report = service.get_zip_report(zip_code)
    if not report:
        raise HTTPException(status_code=404, detail=f"No water data found for ZIP {zip_code}")
    return report


@router.get("/compare", response_model=ComparisonReport)
def compare_zip_codes(
    zips: list[str] = Query(..., description="ZIP codes to compare"),
    db: Session = Depends(get_db),
):
    """Compare water quality across multiple ZIP codes side-by-side."""
    if len(zips) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 ZIP codes to compare")
    if len(zips) > 5:
        raise HTTPException(status_code=400, detail="Max 5 ZIP codes per comparison")

    service = WaterService(db)
    reports = []
    for zip_code in zips:
        report = service.get_zip_report(zip_code)
        if report:
            reports.append(report)

    if len(reports) < 2:
        raise HTTPException(status_code=404, detail="Not enough ZIP codes with data to compare")

    return ComparisonReport(zip_codes=zips, reports=reports)


@router.get("/systems", response_model=list[WaterSystemSummary])
def list_water_systems(
    state: str | None = None,
    county: str | None = None,
    risk: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """List water systems with optional filters."""
    service = WaterService(db)
    return service.list_systems(state=state, county=county, risk=risk, limit=limit, offset=offset)


@router.get("/contaminants/{pwsid}")
def get_contaminants(pwsid: str, db: Session = Depends(get_db)):
    """Get all contaminant results for a specific water system."""
    service = WaterService(db)
    results = service.get_contaminants(pwsid)
    if not results:
        raise HTTPException(status_code=404, detail=f"No data for system {pwsid}")
    return results


@router.get("/history/{pwsid}")
def get_violation_history(pwsid: str, db: Session = Depends(get_db)):
    """Get violation history timeline for a water system."""
    service = WaterService(db)
    return service.get_violation_history(pwsid)


@router.get("/map/states")
def get_state_risks(db: Session = Depends(get_db)):
    """Get state-level risk data for the national map."""
    service = WaterService(db)
    return service.get_state_risks()


@router.get("/map/counties/{state_code}")
def get_county_risks(state_code: str, db: Session = Depends(get_db)):
    """Get county-level risk data for a specific state."""
    service = WaterService(db)
    return service.get_county_risks(state_code)


@router.get("/map/systems")
def get_map_systems(state: str | None = None, db: Session = Depends(get_db)):
    """Get water systems with lat/lng and risk level for map markers."""
    service = WaterService(db)
    return service.get_map_data(state_code=state)


@router.get("/health")
def health_check():
    return {"status": "ok"}
