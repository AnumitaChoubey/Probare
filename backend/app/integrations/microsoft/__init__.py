from .ms_graph_adapter import MSGraphAdapter, TeamsDestination, TeamsDestinationType
from .mock_graph_provider import MockMSGraphProvider
from .graph_api_provider import GraphAPIProvider
from app.core.config import settings

def get_ms_graph_adapter() -> MSGraphAdapter:
    if settings.MS_GRAPH_PROVIDER.lower() == "mock":
        return MockMSGraphProvider()
    return GraphAPIProvider()
