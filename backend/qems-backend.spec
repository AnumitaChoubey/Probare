# -*- mode: python -*-
from PyInstaller.utils.hooks import collect_submodules

a = Analysis(
    ['run_desktop_server.py'],
    pathex=['.'],
    hiddenimports=[
        'app.db.models',
        'app.db.models.user',
        'app.db.models.role',
        'app.db.models.user_role',
        'app.db.models.lob',
        'app.db.models.category',
        'app.db.models.sub_category',
        'app.db.models.error',
        'app.db.models.error_status_history',
        'app.db.models.qa_error_id_sequence',
        'app.db.models.rebuttal',
        'app.db.models.decision',
        'app.db.models.evidence_file',
        'app.db.models.evidence_access_log',
        'app.db.models.notification_template',
        'app.db.models.notifications_log',
        'app.db.models.in_app_notification',
        'app.db.models.evidence_rule',
        'app.db.models.holiday',
        'app.db.models.config_change_history',
        'app.db.models.sla_rule',
        'app.db.models.escalation_matrix',
        'app.db.models.ownership_mapping',
        'app.db.models.working_hours_calendar',
        'app.db.models.sync',
        'uvicorn.logging',
        'uvicorn.loops.auto',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan.on',
        'aiosqlite',
        'apscheduler'
    ],
    datas=[
        ('alembic', 'alembic'),
        ('alembic_sqlite', 'alembic_sqlite'),
        ('alembic_sqlite.ini', '.'),
    ],
)
exe = EXE(
    a.pyz, a.scripts, a.binaries, a.zipfiles, a.datas,
    name='qems-backend',
    console=True,   # Setting to True for debugging right now
    onefile=True,
)
