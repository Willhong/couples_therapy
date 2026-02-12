"""Information state tracking for the therapeutic listener chat agent.

Defines the data structures used to track what the chat agent has learned
about a conflict during conversation, and the state of insight delivery.
"""

from typing import TypedDict


class ConflictInformation(TypedDict, total=False):
    """Tracks what the chat agent has learned about a conflict.

    Each field represents a piece of information that the agent tries
    to gather through natural conversation. Fields are booleans for
    whether the info has been collected, or lists/strings for actual data.
    """

    # Boolean flags: has this info been gathered?
    event_described: bool
    user_emotion_expressed: bool
    partner_behavior_described: bool
    trigger_identified: bool
    context_provided: bool
    desired_outcome_expressed: bool

    # Collected data
    conflict_topic: str
    user_emotions: list[str]
    partner_emotions: list[str]
    key_quotes: list[str]
    escalation_level: str  # "low", "medium", "high"


class ChatAgentState(TypedDict, total=False):
    """Conversation tracking state for the chat agent.

    Maintains the overall state of the conversation including
    message count, conflict information gathered, and conversation phase.
    """

    message_count: int
    conflict_info: ConflictInformation
    conversation_phase: str  # "initial", "exploring", "deepening", "wrapping_up"
    communication_frequency: str
    attachment_style_label: str
    gathering_strategy: str
    missing_information: list[str]
    current_emotional_intensity: str  # "low", "medium", "high"
    mood_trajectory: list[str]


class InsightDeliveryState(TypedDict, total=False):
    """Tracks the state of insight delivery to the user.

    After sufficient information is gathered, insights are generated
    by the analysis system and delivered through this state machine.
    """

    pending_insights: list[dict]
    insights_offered: bool
    user_consented: bool
    insights_delivered: list[dict]
    delivery_phase: str  # "none", "offering", "delivering", "completed"
