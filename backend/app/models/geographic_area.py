from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class GeographicArea(Base):
    __tablename__ = "geographic_areas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pwsid = Column(String(12), ForeignKey("water_systems.pwsid"), index=True)
    zip_code = Column(String(10), index=True)
    county_served = Column(String(100))
    city_served = Column(String(100))
    state_code = Column(String(2), default="TX")

    water_system = relationship("WaterSystem", back_populates="geographic_areas")
