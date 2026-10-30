import 'package:flutter/material.dart';

import '../theme/chalk_theme.dart';
import '../widgets/clay_button.dart';
import '../widgets/cream_scaffold.dart';

/// One typed line. Nothing on this screen listens for speech.
class AskBoardScreen extends StatefulWidget {
  const AskBoardScreen({
    super.key,
    required this.lessonPart,
    required this.onSend,
    this.onBindReply,
  });

  final String lessonPart;
  final Future<void> Function(String text) onSend;

  /// Called once so a reply from the laptop can be shown on this screen.
  final void Function(void Function(String answer) show)? onBindReply;

  @override
  State<AskBoardScreen> createState() => _AskBoardScreenState();
}

class _AskBoardScreenState extends State<AskBoardScreen> {
  final _controller = TextEditingController();
  final _lines = <_Line>[];
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    widget.onBindReply?.call((answer) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _lines.add(_Line(text: answer, mine: false));
      });
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _controller.text.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (text.isEmpty || _sending) return;
    setState(() {
      _sending = true;
      _lines.add(_Line(text: text, mine: true));
      _controller.clear();
    });
    await widget.onSend(text);
    if (!mounted) return;
    setState(() => _sending = false);
  }

  @override
  Widget build(BuildContext context) {
    return CreamScaffold(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(28, 24, 28, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(widget.lessonPart, style: chalkSubtitle, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            const Text('Ask the board', style: chalkTitle, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            const Text(
              'The board answers here.',
              style: chalkSubtitle,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 18),
            Expanded(
              child: ListView(
                children: [
                  for (final line in _lines)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Text(
                        line.mine ? line.text : line.text,
                        textAlign: line.mine ? TextAlign.right : TextAlign.left,
                        style: TextStyle(
                          color: line.mine ? ChalkColors.ink : ChalkColors.brownDeep,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  if (_lines.isNotEmpty && _lines.last.mine)
                    const Text(
                      'The board is answering.',
                      style: chalkSubtitle,
                    ),
                ],
              ),
            ),
            TextField(
              controller: _controller,
              autofocus: true,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => _send(),
              decoration: const InputDecoration(hintText: 'Type one line'),
              style: const TextStyle(
                color: ChalkColors.ink,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 18),
            ClayButton(
              label: _sending ? 'Sending' : 'Send',
              onPressed: _sending ? null : () => _send(),
            ),
          ],
        ),
      ),
    );
  }
}

class _Line {
  const _Line({required this.text, required this.mine});

  final String text;
  final bool mine;
}
