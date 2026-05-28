from __future__ import annotations

import csv
import io
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Ticket
from admin_panel import verify_admin_token

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/rides/daily")
def rides_daily(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    _admin: str = Depends(verify_admin_token),
    db: Session = Depends(get_db),
):
    q = (
        db.query(func.date(Ticket.created_at).label("day"), func.count(Ticket.id), func.coalesce(func.sum(Ticket.passengers), 0), func.coalesce(func.sum(Ticket.fare_amount), 0))
        .filter(func.date(Ticket.created_at) >= from_date, func.date(Ticket.created_at) <= to_date)
        .group_by(func.date(Ticket.created_at))
        .order_by(func.date(Ticket.created_at).asc())
    )
    rows = q.all()
    return [
        {
            "date": str(r[0]),
            "tripCount": int(r[1] or 0),
            "passengerCount": int(r[2] or 0),
            "revenue": float(r[3] or 0),
        }
        for r in rows
    ]


@router.get("/export.csv")
def export_csv(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    _admin: str = Depends(verify_admin_token),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Ticket)
        .filter(func.date(Ticket.created_at) >= from_date, func.date(Ticket.created_at) <= to_date)
        .order_by(Ticket.created_at.desc())
        .all()
    )

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["ref_no", "created_at", "service_date", "departure_time", "origin", "destination", "passengers", "fare_amount", "status"])
    for t in rows:
        w.writerow(
            [
                t.ref_no,
                t.created_at.isoformat() if t.created_at else "",
                t.service_date.isoformat() if t.service_date else "",
                t.departure_time.strftime("%H:%M") if t.departure_time else "",
                t.origin or "",
                t.destination or "",
                int(t.passengers or 1),
                float(t.fare_amount or 0),
                t.status or "",
            ]
        )

    csv_bytes = buf.getvalue().encode("utf-8")
    filename = f"ezsakay_tickets_{from_date.isoformat()}_{to_date.isoformat()}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

