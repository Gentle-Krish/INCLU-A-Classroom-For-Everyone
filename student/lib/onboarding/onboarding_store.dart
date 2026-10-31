import 'package:shared_preferences/shared_preferences.dart';

/// Persists whether the user has completed or skipped the onboarding flow.
class OnboardingStore {
  static const completedKey = 'has_completed_onboarding';

  Future<bool> hasCompleted() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(completedKey) ?? false;
  }

  Future<void> setCompleted([bool completed = true]) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(completedKey, completed);
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(completedKey);
  }
}
