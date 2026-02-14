"""Verify all Fernet-encrypted fields decrypt correctly after migration."""
import sys
import os
from pathlib import Path

# Ensure the backend directory is on sys.path so Django can find 'config'
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

import django
django.setup()

from cryptography.fernet import InvalidToken


# Define all encrypted fields to verify:
# (app_label, model_name, field_name)
ENCRYPTED_FIELDS = [
    ('chat', 'Message', 'content'),
    ('chat', 'ConversationSummary', 'summary_text'),
    ('chat', 'SharedReframing', 'partner_response'),
    ('audio', 'AudioRecording', 'full_text'),
    ('audio', 'TranscriptSegment', 'text'),
    ('consents', 'RecordingConsent', 'requester_ip'),
    ('consents', 'RecordingConsent', 'responder_ip'),
    ('consents', 'DisclaimerConsent', 'ip_address'),
    ('patterns', 'InsightSummary', 'ai_summary'),
    ('patterns', 'WeeklySummary', 'trend_text'),
    ('intelligence', 'InsightReport', 'pattern_analysis'),
    ('intelligence', 'InsightReport', 'emotion_analysis'),
    ('intelligence', 'InsightReport', 'balance_analysis'),
    ('intelligence', 'InsightReport', 'resolution_suggestions'),
    ('intelligence', 'InsightReport', 'report_summary'),
]


def verify_encrypted_fields():
    """Check that all encrypted fields can be decrypted."""
    from django.apps import apps

    passed = 0
    failed = 0
    skipped = 0
    total = len(ENCRYPTED_FIELDS)

    print(f"Verifying {total} encrypted fields across models...\n")

    # Group fields by model to avoid redundant queries
    model_fields = {}
    for app_label, model_name, field_name in ENCRYPTED_FIELDS:
        key = (app_label, model_name)
        if key not in model_fields:
            model_fields[key] = []
        model_fields[key].append(field_name)

    for (app_label, model_name), fields in model_fields.items():
        try:
            Model = apps.get_model(app_label, model_name)
        except LookupError:
            print(f"  FAIL: {app_label}.{model_name} - Model not found")
            failed += len(fields)
            continue

        if not Model.objects.exists():
            for field_name in fields:
                print(f"  SKIP: {app_label}.{model_name}.{field_name} - No records")
                skipped += 1
            continue

        # Get the first record
        record = Model.objects.first()

        for field_name in fields:
            try:
                value = getattr(record, field_name)
                # If the field is nullable and None, that's fine
                if value is None:
                    print(f"  PASS: {app_label}.{model_name}.{field_name} = None (nullable field)")
                    passed += 1
                else:
                    # Successfully accessed the value (decryption happened)
                    preview = str(value)[:50] + "..." if len(str(value)) > 50 else str(value)
                    print(f"  PASS: {app_label}.{model_name}.{field_name} = \"{preview}\"")
                    passed += 1
            except InvalidToken as e:
                print(f"  FAIL: {app_label}.{model_name}.{field_name} - InvalidToken: {e}")
                failed += 1
            except Exception as e:
                print(f"  FAIL: {app_label}.{model_name}.{field_name} - {type(e).__name__}: {e}")
                failed += 1

    print(f"\n{'='*60}")
    print(f"Results: {passed} passed, {failed} failed, {skipped} skipped (no data)")
    print(f"Total checked: {total}")
    print(f"{'='*60}")

    if failed > 0:
        print("\nFAILED: Some encrypted fields could not be decrypted!")
        return 1
    else:
        print("\nSUCCESS: All encrypted fields verified!")
        return 0


if __name__ == '__main__':
    sys.exit(verify_encrypted_fields())
