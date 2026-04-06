from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class WaterSystem(Base):
    __tablename__ = "water_systems"

    pwsid = Column(String(12), primary_key=True, index=True)  # e.g., TX1010001
    name = Column(String(255), nullable=False)
    primary_source = Column(String(50))  # Ground water, Surface water, etc.
    system_type = Column(String(10))  # CWS, NTNCWS, TNCWS
    population_served = Column(Integer)
    counties_served = Column(String(500))
    owner_type = Column(String(50))  # Federal, State, Local, Private
    activity_status = Column(String(20))  # Active, Inactive
    latitude = Column(Float)
    longitude = Column(Float)

    # Compliance summary (updated from ECHO)
    serious_violator = Column(Boolean, default=False)
    violation_count_3yr = Column(Integer, default=0)
    health_violation_count_3yr = Column(Integer, default=0)

    last_updated = Column(DateTime)

    # Relationships
    violations = relationship("Violation", back_populates="water_system")
    contaminant_results = relationship("ContaminantResult", back_populates="water_system")
    geographic_areas = relationship("GeographicArea", back_populates="water_system")
