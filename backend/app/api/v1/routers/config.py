from fastapi import APIRouter
import json
import os

router = APIRouter()

config_path = os.path.join(os.path.dirname(__file__), '..', '..', 'core', 'state_machine.json')
with open(config_path, 'r') as f:
    STATE_MACHINE_CONFIG = json.load(f)

@router.get("/state-machine")
async def get_state_machine_config():
    """Returns the global state machine declarative config."""
    return STATE_MACHINE_CONFIG
