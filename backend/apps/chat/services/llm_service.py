"""LangChain LLM service with provider abstraction.

Supports multiple LLM providers (OpenAI, Anthropic, Google) with
configuration via environment variables. Uses LangChain's unified
interface for consistent API across providers.
"""

import os
import logging
from typing import Any

from django.conf import settings
from langchain_core.language_models import BaseChatModel

logger = logging.getLogger(__name__)


class LLMConfigurationError(Exception):
    """Raised when LLM is not properly configured."""
    pass


def _get_openai_model(model_name: str, **kwargs: Any) -> BaseChatModel:
    """Get OpenAI chat model instance."""
    from langchain_openai import ChatOpenAI

    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise LLMConfigurationError(
            "OPENAI_API_KEY environment variable is required for OpenAI provider"
        )

    return ChatOpenAI(
        model=model_name,
        api_key=api_key,
        temperature=kwargs.get('temperature', settings.LLM_TEMPERATURE),
        max_tokens=kwargs.get('max_tokens', settings.LLM_MAX_TOKENS),
        streaming=kwargs.get('streaming', True),
    )


def _get_anthropic_model(model_name: str, **kwargs: Any) -> BaseChatModel:
    """Get Anthropic chat model instance."""
    from langchain_anthropic import ChatAnthropic

    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        raise LLMConfigurationError(
            "ANTHROPIC_API_KEY environment variable is required for Anthropic provider"
        )

    return ChatAnthropic(
        model=model_name,
        api_key=api_key,
        temperature=kwargs.get('temperature', settings.LLM_TEMPERATURE),
        max_tokens=kwargs.get('max_tokens', settings.LLM_MAX_TOKENS),
        streaming=kwargs.get('streaming', True),
    )


def _get_google_model(model_name: str, **kwargs: Any) -> BaseChatModel:
    """Get Google Gemini chat model instance."""
    from langchain_google_genai import ChatGoogleGenerativeAI

    api_key = os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        raise LLMConfigurationError(
            "GOOGLE_API_KEY environment variable is required for Google provider"
        )

    return ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=api_key,
        temperature=kwargs.get('temperature', settings.LLM_TEMPERATURE),
        max_output_tokens=kwargs.get('max_tokens', settings.LLM_MAX_TOKENS),
        streaming=kwargs.get('streaming', True),
    )


# Provider registry
_PROVIDER_FACTORIES = {
    'openai': _get_openai_model,
    'anthropic': _get_anthropic_model,
    'google': _get_google_model,
}


def get_chat_model(**kwargs: Any) -> BaseChatModel:
    """Get chat model instance based on configured provider.

    Uses LLM_PROVIDER setting to determine which provider to use,
    and LLM_MODELS[provider]['chat'] for the model name.

    Args:
        **kwargs: Additional arguments to pass to the model constructor
            - temperature: Override default temperature
            - max_tokens: Override default max tokens
            - streaming: Enable/disable streaming (default: True)

    Returns:
        BaseChatModel: LangChain chat model instance

    Raises:
        LLMConfigurationError: If provider is not supported or API key is missing
    """
    provider = settings.LLM_PROVIDER

    if provider not in _PROVIDER_FACTORIES:
        raise LLMConfigurationError(
            f"Unsupported LLM provider: {provider}. "
            f"Supported providers: {list(_PROVIDER_FACTORIES.keys())}"
        )

    if provider not in settings.LLM_MODELS:
        raise LLMConfigurationError(
            f"No model configuration found for provider: {provider}"
        )

    model_name = settings.LLM_MODELS[provider]['chat']
    factory = _PROVIDER_FACTORIES[provider]

    logger.info(f"Creating chat model: provider={provider}, model={model_name}")

    return factory(model_name, **kwargs)


def get_summarization_model(**kwargs: Any) -> BaseChatModel:
    """Get summarization model instance based on configured provider.

    Uses a smaller/cheaper model for summarization tasks.
    Uses LLM_PROVIDER setting to determine which provider to use,
    and LLM_MODELS[provider]['summarization'] for the model name.

    Args:
        **kwargs: Additional arguments to pass to the model constructor

    Returns:
        BaseChatModel: LangChain chat model instance for summarization
    """
    provider = settings.LLM_PROVIDER

    if provider not in _PROVIDER_FACTORIES:
        raise LLMConfigurationError(
            f"Unsupported LLM provider: {provider}"
        )

    model_name = settings.LLM_MODELS[provider]['summarization']
    factory = _PROVIDER_FACTORIES[provider]

    # Override defaults for summarization: lower temperature, fewer tokens
    summarization_kwargs = {
        'temperature': 0.3,
        'max_tokens': 500,
        'streaming': False,  # Summarization doesn't need streaming
        **kwargs,
    }

    logger.info(f"Creating summarization model: provider={provider}, model={model_name}")

    return factory(model_name, **summarization_kwargs)


def get_provider_info() -> dict:
    """Get information about the configured LLM provider.

    Returns:
        dict: Provider information including name, models, and configuration status
    """
    provider = settings.LLM_PROVIDER

    # Check API key availability
    api_key_env_vars = {
        'openai': 'OPENAI_API_KEY',
        'anthropic': 'ANTHROPIC_API_KEY',
        'google': 'GOOGLE_API_KEY',
    }

    env_var = api_key_env_vars.get(provider, '')
    has_api_key = bool(os.environ.get(env_var))

    models = settings.LLM_MODELS.get(provider, {})

    return {
        'provider': provider,
        'chat_model': models.get('chat', 'not configured'),
        'summarization_model': models.get('summarization', 'not configured'),
        'api_key_configured': has_api_key,
        'api_key_env_var': env_var,
        'max_tokens': settings.LLM_MAX_TOKENS,
        'temperature': settings.LLM_TEMPERATURE,
    }
