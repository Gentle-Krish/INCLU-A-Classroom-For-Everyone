import 'package:flutter/material.dart';

/// Data model representing a single step in the accessible onboarding flow.
///
/// Both [instruction] (spoken via Text-to-Speech) and [matchingText] (visible on screen)
/// are provided so blind, deaf, and hard-of-hearing students receive identical guidance.
class OnboardingStep {
  const OnboardingStep({
    required this.title,
    required this.instruction,
    required this.matchingText,
    required this.icon,
  });

  final String title;
  final String instruction;
  final String matchingText;
  final IconData icon;
}

/// Default onboarding steps explaining Inclu's features and accessible everyday controls.
const List<OnboardingStep> defaultOnboardingSteps = [
  OnboardingStep(
    title: 'Welcome to Inclu',
    instruction:
        'Inclu helps everyone participate in class. You can join by listening for the code, scanning the board, or typing the 4-digit class code.',
    matchingText:
        '• Automatic voice listening for hands-free joining.\n• Scan QR code or enter code manually.\n• Audio and visual feedback work together for full accessibility.',
    icon: Icons.school_rounded,
  ),
  OnboardingStep(
    title: 'Voice & Listening',
    instruction:
        'Your phone listens for your class number or name without needing to tap the screen. Spoken prompts and text match at every step.',
    matchingText:
        '• Hands-free voice join.\n• Spoken prompts played via Text-to-Speech.\n• Onscreen text matches spoken words for deaf and hard-of-hearing users.',
    icon: Icons.mic_rounded,
  ),
  OnboardingStep(
    title: 'Quests, Notes & Board',
    instruction:
        'Once connected, view live class notes, practice with classroom quests, and ask questions directly to the teacher board.',
    matchingText:
        '• Real-time class notes with AI revision.\n• Practice quests with speech or tap choices.\n• Send questions directly to the main board.',
    icon: Icons.quiz_rounded,
  ),
  OnboardingStep(
    title: 'Accessible Everywhere',
    instruction:
        'Inclu is designed for blind, deaf, and all students. High-contrast controls, screen reader semantics, and the Help button keep you supported.',
    matchingText:
        '• Full support for screen readers (TalkBack / VoiceOver).\n• Large high-contrast touch targets.\n• Tap "Help" anytime to replay spoken & visual instructions.',
    icon: Icons.accessibility_new_rounded,
  ),
];
