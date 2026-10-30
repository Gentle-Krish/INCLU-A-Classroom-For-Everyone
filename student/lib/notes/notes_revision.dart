/// Official unauthenticated Gemma 4 E2B file. Hugging Face answers 302, then the file.
const String gemma4E2bDownloadUrl =
    'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it.litertlm';

/// Byte size of that file. A shorter file is a partial download, not a model.
const int gemma4E2bBytes = 2588147712;

/// True when [length] is the complete official file, so the phone must not download it again.
bool gemmaWeightIsComplete(int length) => length >= gemma4E2bBytes;

/// Where a stopped download should continue. A short file is kept.
int resumeByte(int partialLength) {
  if (partialLength <= 0) return 0;
  if (partialLength >= gemma4E2bBytes) return gemma4E2bBytes;
  return partialLength;
}

/// Progress for the whole file, including bytes already on the phone.
int downloadPercent(int received) {
  if (received <= 0) return 0;
  if (received >= gemma4E2bBytes) return 100;
  final percent = ((received / gemma4E2bBytes) * 100).floor();
  if (percent > 99) return 99;
  return percent;
}

/// Download and revise states the phone can show without loading Gemma.
enum NotesSetupKind { needsModel, started, pulling, ready, failed }

class NotesSetup {
  const NotesSetup({required this.kind, this.percent, this.message});

  final NotesSetupKind kind;

  /// 0–100 while [kind] is [NotesSetupKind.pulling], when the download reports it.
  final int? percent;

  /// English status or failure. Empty when the screen uses its own copy.
  final String? message;
}

/// On-device note revision. Tests use a fake. The phone uses [EdgeGemmaNotes].
abstract class NotesRevision {
  NotesSetup get setup;

  Stream<NotesSetup> get changes;

  /// Check whether Gemma is already on the phone. Does not start a download.
  Future<void> look();

  /// Download Gemma. Emits started, then pulling, then ready or failed.
  Future<void> startDownload();

  /// Ask the on-device model to revise [note].
  Future<String> revise(String note);
}

/// Plain English for a failed download. Never returns a stack trace.
String englishDownloadFailure(Object error) {
  final raw = error.toString().toLowerCase();
  if (raw.contains('space') || raw.contains('storage')) {
    return 'This phone does not have enough free space for the model.';
  }
  if (raw.contains('it will continue')) {
    return 'The download stopped. Try again. It will continue.';
  }
  return 'The model did not download. Check the internet and try again.';
}

/// Plain English when the on-device model cannot revise a note.
String englishReviseFailure(Object error) {
  final raw = error.toString().toLowerCase();
  if (raw.contains('token') ||
      raw.contains('context') ||
      raw.contains('too long')) {
    return 'That note is too long for this phone. Try a shorter note.';
  }
  return 'The note could not be revised. Try again.';
}

/// Drop a leaked thinking channel so the student sees the revised note.
String revisedNoteText(String raw) {
  var text = raw.trim();
  const end = '<channel|>';
  final cut = text.lastIndexOf(end);
  if (cut != -1) {
    text = text.substring(cut + end.length).trim();
  }
  return text;
}
