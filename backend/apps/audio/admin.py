"""Admin registration for audio models."""

from django.contrib import admin

from .models import AudioRecording, TranscriptSegment, TranscriptEdit


class TranscriptSegmentInline(admin.TabularInline):
    model = TranscriptSegment
    extra = 0
    readonly_fields = ('id', 'speaker', 'speaker_label', 'start_time', 'end_time', 'order')
    fields = ('order', 'speaker', 'speaker_label', 'text', 'start_time', 'end_time', 'emotion_intensity')


@admin.register(AudioRecording)
class AudioRecordingAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'recording_type', 'status', 'duration', 'post_action', 'created_at')
    list_filter = ('status', 'recording_type', 'post_action')
    search_fields = ('user__email',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    inlines = [TranscriptSegmentInline]


@admin.register(TranscriptSegment)
class TranscriptSegmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'recording', 'speaker', 'speaker_label', 'order', 'start_time', 'end_time')
    list_filter = ('speaker',)
    readonly_fields = ('id',)


@admin.register(TranscriptEdit)
class TranscriptEditAdmin(admin.ModelAdmin):
    list_display = ('id', 'segment', 'edited_by', 'field_changed', 'created_at')
    list_filter = ('field_changed',)
    readonly_fields = ('id', 'created_at')
