import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';

import '../theme/chalk_theme.dart';
import '../widgets/clay_bot.dart';
import '../widgets/clay_button.dart';
import '../widgets/cream_scaffold.dart';
import 'onboarding_step.dart';

/// Interactive onboarding flow widget providing spoken instructions, matching text,
/// and Next, Back, Repeat, Skip, and Finish controls.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({
    super.key,
    required this.onComplete,
    this.steps = defaultOnboardingSteps,
    this.tts,
  });

  final VoidCallback onComplete;
  final List<OnboardingStep> steps;
  final FlutterTts? tts;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  late final FlutterTts _tts;
  int _currentStep = 0;

  @override
  void initState() {
    super.initState();
    _tts = widget.tts ?? FlutterTts();
    _speakCurrentStep();
  }

  @override
  void dispose() {
    unawaited(_tts.stop().catchError((_) {}));
    super.dispose();
  }

  void _speakCurrentStep() {
    if (widget.steps.isEmpty) return;
    unawaited(() async {
      try {
        await _tts.stop();
        await _tts.awaitSpeakCompletion(true);
        if (!mounted) return;
        final step = widget.steps[_currentStep];
        await _tts.speak('${step.title}. ${step.instruction}');
      } catch (_) {}
    }());
  }

  void _stopAndFinish() {
    unawaited(_tts.stop().catchError((_) {}));
    if (!mounted) return;
    widget.onComplete();
  }

  void _nextStep() {
    if (_currentStep < widget.steps.length - 1) {
      setState(() {
        _currentStep++;
      });
      _speakCurrentStep();
    } else {
      _stopAndFinish();
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
      });
      _speakCurrentStep();
    }
  }

  void _repeatStep() {
    _speakCurrentStep();
  }

  @override
  Widget build(BuildContext context) {
    final step = widget.steps[_currentStep];
    final isFirst = _currentStep == 0;
    final isLast = _currentStep == widget.steps.length - 1;

    return CreamScaffold(
      child: SafeArea(
        child: Column(
          children: [
            // Header Bar with Step Indicator & Skip Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Semantics(
                    label: 'Step ${_currentStep + 1} of ${widget.steps.length}',
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: ChalkColors.box,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Text(
                        'STEP ${_currentStep + 1} OF ${widget.steps.length}',
                        style: const TextStyle(
                          color: ChalkColors.brownDeep,
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                          letterSpacing: 1.1,
                        ),
                      ),
                    ),
                  ),
                  Semantics(
                    button: true,
                    label: 'Skip onboarding',
                    hint: 'Exit onboarding and start using the app',
                    child: TextButton.icon(
                      onPressed: _stopAndFinish,
                      icon: const Icon(Icons.close_rounded, color: ChalkColors.brown, size: 20),
                      label: const Text(
                        'Skip',
                        style: TextStyle(
                          color: ChalkColors.brownDeep,
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Scrollable Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                child: Column(
                  children: [
                    const ClayBot(size: 110),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(step.icon, color: ChalkColors.peach, size: 28),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            step.title,
                            style: chalkTitle,
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Instruction & Matching Text Card
                    Semantics(
                      liveRegion: true,
                      label:
                          '${step.title}. ${step.instruction}. Matching visual instructions: ${step.matchingText}',
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: ChalkColors.creamDeep,
                          borderRadius: BorderRadius.circular(28),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x14000000),
                              blurRadius: 20,
                              offset: Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.record_voice_over_rounded,
                                    color: ChalkColors.peach, size: 22),
                                SizedBox(width: 8),
                                Text(
                                  'SPOKEN INSTRUCTION',
                                  style: TextStyle(
                                    color: ChalkColors.brown,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 12,
                                    letterSpacing: 1.1,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              step.instruction,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: ChalkColors.ink,
                                height: 1.35,
                              ),
                            ),
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 14),
                              child: Divider(color: ChalkColors.box, height: 1),
                            ),
                            const Row(
                              children: [
                                Icon(Icons.visibility_rounded,
                                    color: ChalkColors.green, size: 22),
                                SizedBox(width: 8),
                                Text(
                                  'MATCHING TEXT & CONTROLS',
                                  style: TextStyle(
                                    color: ChalkColors.brown,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 12,
                                    letterSpacing: 1.1,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              step.matchingText,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: ChalkColors.brownDeep,
                                height: 1.45,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),

            // Bottom Control Bar with Back, Repeat, Next / Finish
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
              child: Row(
                children: [
                  // Back Button
                  Expanded(
                    child: ClayButton(
                      label: 'Back',
                      fontSize: 16,
                      color: ChalkColors.creamButton,
                      lip: ChalkColors.creamLip,
                      foreground: ChalkColors.brownDeep,
                      semanticHint: 'Go back to previous step',
                      onPressed: isFirst ? null : _previousStep,
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Repeat Button
                  Expanded(
                    child: ClayButton(
                      label: 'Repeat',
                      fontSize: 16,
                      color: ChalkColors.green,
                      lip: ChalkColors.greenLip,
                      foreground: Colors.white,
                      icon: const Icon(Icons.replay_rounded, size: 18, color: Colors.white),
                      semanticHint: 'Replay spoken instruction aloud',
                      onPressed: _repeatStep,
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Next or Finish Button
                  Expanded(
                    child: ClayButton(
                      label: isLast ? 'Finish' : 'Next',
                      fontSize: 16,
                      color: ChalkColors.peach,
                      lip: ChalkColors.peachLip,
                      foreground: Colors.white,
                      icon: Icon(
                        isLast ? Icons.check_circle_rounded : Icons.arrow_forward_rounded,
                        size: 18,
                        color: Colors.white,
                      ),
                      semanticHint: isLast ? 'Complete onboarding flow' : 'Go to next step',
                      onPressed: _nextStep,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
