from __future__ import annotations

from datetime import time
from decimal import Decimal

from sqlalchemy.orm import Session

from models import DepartureSchedule, Route, RouteLandmark


DEFAULT_ROUTE_NAME = "Digos City Public Terminal ? Upper Bala (Bansalan)"
DEFAULT_OPERATOR = "DASUTRANSCO"


ROUTE_LANDMARKS = [
    ("Digos City Public Terminal", 0, "15.00"),
    ("V8 Gas Station", 1, "15.00"),
    ("Central Convenience (Rizal Ave.)", 2, "15.00"),
    ("Green Coffee/Land Bank", 3, "15.00"),
    ("Total Gas Station (Quezon Ave.)", 4, "15.00"),
    ("Flying V Gas Station", 5, "17.25"),
    ("Iglesia ni Cristo", 6, "19.50"),
    ("Tenessee Homes", 7, "21.50"),
    ('Greneth Store/"Kaangan"', 8, "23.75"),
    ("AJM Mango Buyer", 9, "26.00"),
    ("Colorado Elem. School", 10, "28.25"),
    ("Sinaragan Bridge", 11, "30.50"),
    ("GKK Birhen sa Fatima", 12, "32.50"),
    ("Crossing Cabligan", 13, "34.75"),
    ("South Adventist Philippine College", 14, "37.00"),
    ("Epyong's Cambingan", 15, "39.25"),
    ("Matanao MPS Community Outpost", 16, "41.50"),
    ("DASURECO Facility", 17, "43.50"),
    ("Sacub Bridge", 18, "45.75"),
    ("Mabuhay Barangay Hall", 19, "48.00"),
    ("Rose Bakeshop", 20, "50.25"),
    ("Bansalan Terminal", 21, "52.50"),
    ("University of Mindanao Bansalan", 22, "54.50"),
    ("Bansalan-Magsaysay Hwy.", 23, "56.75"),
    ("Jona Store", 24, "59.00"),
    ("FCC Laundry Shop", 25, "61.25"),
    ("So-ok Basketball Court", 26, "63.50"),
    ("Magsaysay Medical Center", 27, "65.50"),
    ("Bansalan-Magsaysay", 28, "67.75"),
    ("AJ Gas Station", 29, "70.00"),
    ("Prk 4. Bob Barayong", 30, "72.25"),
    ("Bulatukan Steel Bridge", 31, "74.50"),
    ("kilolog Basketball Court", 32, "76.50"),
    ("Puro 4", 33, "78.75"),
    ("Iglesia ni Cristo Prk 1. Lower Bala", 34, "81.00"),
    ("Lower Bala", 35, "83.25"),
    ("Upper Bala", 36, "85.50"),
    ("GKK Sr. San Miguel Upper Bala", 37, "87.50"),
    ("Upper Bala Brgy. Hall", 38, "89.75"),
]


DEPARTURE_TIMES = [
    "05:00",
    "06:00",
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
]


def _parse_hhmm(s: str) -> time:
    hh, mm = s.split(":")
    return time(int(hh), int(mm), 0)


def seed_default_route(db: Session) -> Route:
    route = (
        db.query(Route)
        .filter(Route.name == DEFAULT_ROUTE_NAME)
        .first()
    )
    if route:
        return route

    route = Route(name=DEFAULT_ROUTE_NAME, operator=DEFAULT_OPERATOR, is_active=True)
    db.add(route)
    db.commit()
    db.refresh(route)

    # Landmarks
    for idx, (name, distance, fare) in enumerate(ROUTE_LANDMARKS, start=1):
        db.add(
            RouteLandmark(
                route_id=route.id,
                sequence=idx,
                name=name,
                distance_km=Decimal(str(distance)),
                fare_from_origin=Decimal(fare),
            )
        )
    db.commit()

    # Schedules
    for t in DEPARTURE_TIMES:
        db.add(
            DepartureSchedule(
                route_id=route.id,
                departure_time=_parse_hhmm(t),
                capacity=30,
                is_active=True,
            )
        )
    db.commit()

    return route

