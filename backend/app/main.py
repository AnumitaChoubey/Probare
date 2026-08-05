from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth.router import router as auth_router

app = FastAPI(
    title="QEMS — Quality Error Management System",
    version="1.0.0",
    description="Backend API for the QEMS platform",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["Auth"])

# ── P1: Foundation routers — added by Person 1 ────────────────────────────────
# from app.auth.routes import router as auth_router
# from app.errors.routes import router as errors_router
# from app.admin.lobs import router as lobs_router
# from app.admin.categories import router as categories_router
# from app.admin.sub_categories import router as sub_categories_router
# from app.admin.users import router as users_router
# app.include_router(auth_router,        prefix="/auth",       tags=["Auth"])
# app.include_router(errors_router,      prefix="/errors",     tags=["Errors"])
# app.include_router(lobs_router,        prefix="/admin/lobs", tags=["Admin"])
# app.include_router(categories_router,  prefix="/admin/categories", tags=["Admin"])
# app.include_router(sub_categories_router, prefix="/admin/sub-categories", tags=["Admin"])
# app.include_router(users_router,       prefix="/admin/users", tags=["Admin"])

# ── P2: Rebuttal & Decision routers — added by Person 2 (one line each) ──────
# from app.rebuttal.routes import router as rebuttal_router
# from app.decision.routes import router as decision_router
# app.include_router(rebuttal_router,  prefix="/errors", tags=["Rebuttal"])
# app.include_router(decision_router,  prefix="/errors", tags=["Decision"])

# ── P3: Evidence & Notifications routers — added by Person 3 ─────────────────
# from app.evidence.routes import router as evidence_router
# from app.notifications.routes import router as notifications_router
# app.include_router(evidence_router,       prefix="/errors",        tags=["Evidence"])
# app.include_router(notifications_router,  prefix="/notifications", tags=["Notifications"])

# ── P4: Search, Dashboards, Reports, Admin routers — added by Person 4 ────────
# from app.search.routes import router as search_router
# from app.dashboards.routes import router as dashboards_router
# from app.reports.routes import router as reports_router
# from app.admin.ownership_mapping import router as ownership_router
# from app.admin.sla_rules import router as sla_router
# from app.admin.escalation_matrix import router as escalation_router
# from app.admin.working_hours import router as working_hours_router
# from app.admin.holidays import router as holidays_router
# from app.admin.config_history import router as config_history_router
# app.include_router(search_router,         prefix="/errors",               tags=["Search"])
# app.include_router(dashboards_router,     prefix="/dashboards",           tags=["Dashboards"])
# app.include_router(reports_router,        prefix="/reports",              tags=["Reports"])
# app.include_router(ownership_router,      prefix="/admin/ownership-mapping", tags=["Admin"])
# app.include_router(sla_router,            prefix="/admin/sla-rules",      tags=["Admin"])
# app.include_router(escalation_router,     prefix="/admin/escalation-matrix", tags=["Admin"])
# app.include_router(working_hours_router,  prefix="/admin/working-hours",  tags=["Admin"])
# app.include_router(holidays_router,       prefix="/admin/holidays",       tags=["Admin"])
# app.include_router(config_history_router, prefix="/admin/config-history", tags=["Admin"])

# ── P3: Notification templates — added by Person 3 ───────────────────────────
# from app.admin.notification_templates import router as notif_templates_router
# app.include_router(notif_templates_router, prefix="/admin/notification-templates", tags=["Admin"])


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "QEMS API"}
