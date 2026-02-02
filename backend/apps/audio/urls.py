"""URL routes for audio API."""

from django.urls import path

from .views import (
    upload_audio,
    recording_status,
    transcript_detail,
    update_segment,
    assign_speakers,
    delete_recording,
    set_post_action,
)

urlpatterns = [
    path('upload/', upload_audio, name='audio-upload'),
    path('<uuid:recording_id>/status/', recording_status, name='audio-status'),
    path('<uuid:recording_id>/transcript/', transcript_detail, name='audio-transcript'),
    path('<uuid:recording_id>/segments/<uuid:segment_id>/', update_segment, name='audio-segment-update'),
    path('<uuid:recording_id>/speakers/', assign_speakers, name='audio-assign-speakers'),
    path('<uuid:recording_id>/action/', set_post_action, name='audio-post-action'),
    path('<uuid:recording_id>/', delete_recording, name='audio-delete'),
]
