"""Services package for chat AI integration."""

from .llm_service import (
    get_chat_model,
    get_summarization_model,
    get_provider_info,
)

__all__ = [
    'get_chat_model',
    'get_summarization_model',
    'get_provider_info',
]


# Lazy imports for modules that may not exist yet during initial setup
def __getattr__(name):
    if name == 'ConversationContextManager':
        from .context_manager import ConversationContextManager
        return ConversationContextManager
    if name == 'reframing_graph':
        from .reframing_graph import reframing_graph
        return reframing_graph
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
