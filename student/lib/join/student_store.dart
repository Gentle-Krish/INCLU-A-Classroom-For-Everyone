import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

class StudentIdentity {
  const StudentIdentity({required this.studentId, this.displayName});

  final String studentId;
  final String? displayName;
}

/// One phone id for the life of the install. Display names are not unique.
class StudentStore {
  static const idKey = 'studentId';
  static const nameKey = 'displayName';

  Future<StudentIdentity> load() async {
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString(idKey);
    if (id == null || id.isEmpty) {
      id = const Uuid().v4();
      await prefs.setString(idKey, id);
    }
    final saved = prefs.getString(nameKey)?.trim();
    return StudentIdentity(
      studentId: id,
      displayName: (saved == null || saved.isEmpty) ? null : saved,
    );
  }

  Future<void> saveName(String name) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(nameKey, name.trim());
  }
}
