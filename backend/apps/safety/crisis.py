"""Crisis detection module for CouplesAI.

Detects crisis keywords in user messages and categorizes severity.
"""

import re
from typing import Dict, List


# Crisis keyword patterns (Korean)
CRISIS_KEYWORDS = {
    'suicide': [
        '자살', '죽고싶', '죽고 싶', '죽을래', '살고싶지않', '살고 싶지 않',
        '자해', '손목', '목을', '목매', '뛰어내리', '투신',
    ],
    'violence': [
        '때리', '맞았', '폭력', '학대', '강제', '위협', '협박',
        '구타', '밀쳤', '밀었', '때림', '맞음', '폭행',
    ],
    'emergency': [
        '살려줘', '살려', '도와줘', '도와', '위험', '응급',
        '구해줘', '구해', '죽을 것 같', '죽을것같',
    ],
}

# Severity scoring
SEVERITY_WEIGHTS = {
    'suicide': 3,      # High severity
    'violence': 2,     # Medium-high severity
    'emergency': 3,    # High severity
}


def detect_crisis(text: str) -> Dict:
    """Detect crisis keywords in text and return analysis.

    Args:
        text: User message text to analyze

    Returns:
        Dictionary with:
            - is_crisis (bool): Whether crisis was detected
            - crisis_type (str): Type of crisis detected (suicide, violence, emergency, none)
            - matched_keywords (list): List of matched keywords
            - severity (str): Severity level (high, medium, low)
    """
    if not text:
        return {
            'is_crisis': False,
            'crisis_type': 'none',
            'matched_keywords': [],
            'severity': 'low',
        }

    # Normalize text for matching
    text_lower = text.lower().strip()

    # Track matches
    matches_by_type = {}
    all_matched_keywords = []

    # Check each crisis type
    for crisis_type, keywords in CRISIS_KEYWORDS.items():
        matched = []
        for keyword in keywords:
            # Use word boundary matching to avoid false positives
            if keyword in text_lower:
                matched.append(keyword)

        if matched:
            matches_by_type[crisis_type] = matched
            all_matched_keywords.extend(matched)

    # Determine if crisis detected
    is_crisis = len(matches_by_type) > 0

    if not is_crisis:
        return {
            'is_crisis': False,
            'crisis_type': 'none',
            'matched_keywords': [],
            'severity': 'low',
        }

    # Determine primary crisis type (highest severity)
    crisis_type = max(
        matches_by_type.keys(),
        key=lambda t: SEVERITY_WEIGHTS.get(t, 0)
    )

    # Calculate severity
    severity_score = sum(
        SEVERITY_WEIGHTS.get(t, 0) * len(keywords)
        for t, keywords in matches_by_type.items()
    )

    # Map score to severity level
    if severity_score >= 5:
        severity = 'high'
    elif severity_score >= 2:
        severity = 'medium'
    else:
        severity = 'low'

    return {
        'is_crisis': True,
        'crisis_type': crisis_type,
        'matched_keywords': list(set(all_matched_keywords)),  # Remove duplicates
        'severity': severity,
    }


def get_crisis_response(crisis_type: str) -> str:
    """Get appropriate crisis response message.

    Args:
        crisis_type: Type of crisis detected

    Returns:
        Korean crisis response message with hotline information
    """
    base_message = """긴급 도움이 필요하신 것 같습니다.

지금 힘든 상황이라면, 전문 상담사와 이야기해 주세요:"""

    if crisis_type == 'suicide':
        hotlines = """
• 자살예방상담전화: 1393 (24시간)
• 정신건강위기상담전화: 1577-0199 (24시간)
• 생명의전화: 1588-9191 (24시간)
• 경찰: 112"""
    elif crisis_type == 'violence':
        hotlines = """
• 여성긴급전화: 1366 (24시간, 가정폭력 상담)
• 경찰: 112
• 자살예방상담전화: 1393 (24시간)
• 정신건강위기상담전화: 1577-0199 (24시간)"""
    elif crisis_type == 'emergency':
        hotlines = """
• 경찰: 112
• 응급: 119
• 여성긴급전화: 1366 (24시간)
• 자살예방상담전화: 1393 (24시간)
• 정신건강위기상담전화: 1577-0199 (24시간)"""
    else:
        hotlines = """
• 자살예방상담전화: 1393 (24시간)
• 정신건강위기상담전화: 1577-0199 (24시간)
• 여성긴급전화: 1366 (24시간)
• 경찰: 112"""

    footer = """
당신은 혼자가 아닙니다. 도움을 받을 수 있습니다."""

    return f"{base_message}{hotlines}{footer}"
