"""Views for safety API."""

from datetime import datetime
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import SafetyAssessment
from .serializers import (
    SafetyAssessmentSerializer,
    SafetyAssessmentCreateSerializer,
)


# Safety assessment questions
SAFETY_QUESTIONS = [
    {
        "id": "power_balance",
        "text_ko": "관계에서 의사결정이 공평하게 이루어지나요?",
        "type": "scale_1_5"
    },
    {
        "id": "fear",
        "text_ko": "파트너에게 두려움을 느낀 적이 있나요?",
        "type": "yes_no"
    },
    {
        "id": "control",
        "text_ko": "파트너가 당신의 행동을 통제하려 한 적이 있나요?",
        "type": "yes_no"
    },
    {
        "id": "verbal_abuse",
        "text_ko": "파트너에게 모욕적인 말을 들은 적이 있나요?",
        "type": "yes_no"
    },
    {
        "id": "physical_safety",
        "text_ko": "신체적으로 안전하지 않다고 느낀 적이 있나요?",
        "type": "yes_no"
    },
]

# Crisis resources
CRISIS_RESOURCES_KO = {
    "hotlines": [
        {
            "name": "여성긴급전화",
            "number": "1366",
            "description": "24시간 가정폭력 상담"
        },
        {
            "name": "자살예방상담전화",
            "number": "1393",
            "description": "24시간 위기상담"
        },
        {
            "name": "정신건강위기상담전화",
            "number": "1577-0199",
            "description": "정신건강 위기상담"
        },
    ],
    "message": "당신의 안전이 가장 중요합니다. 위험한 상황에 있다면 즉시 도움을 요청하세요.",
    "disclaimer": "이 앱은 전문 상담을 대체할 수 없습니다. 폭력적인 관계에서는 전문 기관의 도움을 받으세요."
}


def calculate_risk_level(assessment_data):
    """Calculate risk level based on assessment responses.

    Returns: 'low', 'moderate', or 'high'
    """
    power_balance = assessment_data.get('power_balance', 5)
    fear = assessment_data.get('fear', 'no')
    control = assessment_data.get('control', 'no')
    verbal_abuse = assessment_data.get('verbal_abuse', 'no')
    physical_safety = assessment_data.get('physical_safety', 'no')

    # High risk criteria
    if physical_safety == 'yes' or fear == 'yes':
        return 'high'

    if control == 'yes' and verbal_abuse == 'yes':
        return 'high'

    # Moderate risk criteria
    if any([control == 'yes', verbal_abuse == 'yes']):
        return 'moderate'

    if power_balance < 2:
        return 'moderate'

    # Low risk
    return 'low'


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assess_safety(request):
    """Submit safety assessment.

    Body: {
        "power_balance": 1-5,
        "fear": "yes|no",
        "control": "yes|no",
        "verbal_abuse": "yes|no",
        "physical_safety": "yes|no"
    }

    Returns assessment with risk level and resources if high risk.
    """
    user = request.user

    # Validate request data
    serializer = SafetyAssessmentCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    assessment_data = serializer.validated_data

    # Calculate risk level
    risk_level = calculate_risk_level(assessment_data)

    # Determine if couple features should be enabled
    couple_features_enabled = risk_level != 'high'

    # Create or update assessment
    assessment, created = SafetyAssessment.objects.update_or_create(
        user=user,
        defaults={
            'risk_level': risk_level,
            'assessment_data': assessment_data,
            'completed_at': datetime.now(),
            'couple_features_enabled': couple_features_enabled,
        }
    )

    # Prepare response
    response_data = SafetyAssessmentSerializer(assessment).data

    # Add crisis resources if high risk
    if risk_level == 'high':
        response_data['crisis_resources'] = CRISIS_RESOURCES_KO

    return Response(response_data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def safety_status(request):
    """Get current safety status for the user.

    Returns assessment if exists, or 404 if not completed yet.
    """
    user = request.user

    try:
        assessment = SafetyAssessment.objects.get(user=user)
        serializer = SafetyAssessmentSerializer(assessment)
        return Response(serializer.data)
    except SafetyAssessment.DoesNotExist:
        return Response(
            {'detail': '안전 평가가 완료되지 않았습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def crisis_resources(request):
    """Get crisis resources.

    Returns hotlines and crisis information.
    """
    return Response(CRISIS_RESOURCES_KO)
