"""URL routes for prompts API."""

from django.urls import path

from .views import (
    today_prompt,
    respond_prompt,
    reveal_responses,
    prompt_history,
    topic_library,
)

urlpatterns = [
    path('today/', today_prompt, name='prompts-today'),
    path('respond/', respond_prompt, name='prompts-respond'),
    path('reveal/', reveal_responses, name='prompts-reveal'),
    path('history/', prompt_history, name='prompts-history'),
    path('library/', topic_library, name='prompts-library'),
]
