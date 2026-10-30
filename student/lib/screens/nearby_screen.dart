import 'package:flutter/material.dart';

import '../join/beacon_listener.dart';
import '../theme/chalk_theme.dart';
import '../widgets/clay_bot.dart';
import '../widgets/clay_button.dart';
import '../widgets/cream_scaffold.dart';

class NearbyScreen extends StatelessWidget {
  const NearbyScreen({
    super.key,
    required this.classes,
    required this.onJoin,
    required this.onSayAgain,
    required this.onType,
  });

  final List<NearbyClass> classes;
  final void Function(NearbyClass room) onJoin;
  final VoidCallback onSayAgain;
  final VoidCallback onType;

  @override
  Widget build(BuildContext context) {
    final one = classes.length == 1;
    return CreamScaffold(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
        child: Column(
          children: [
            const ClayBot(size: 120),
            const SizedBox(height: 16),
            Text(
              one ? 'A class is on this network' : 'Classes on this network',
              style: chalkTitle,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              one
                  ? 'Join it, or say a different code.'
                  : 'Tap your class, or say the code.',
              style: chalkSubtitle,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 18),
            for (final room in classes) ...[
              ClayButton(
                label: 'Join ${room.room}',
                onPressed: () => onJoin(room),
              ),
              const SizedBox(height: 12),
            ],
            ClayButton(
              label: 'Say the code',
              color: ChalkColors.creamButton,
              lip: ChalkColors.creamLip,
              foreground: ChalkColors.brownDeep,
              onPressed: onSayAgain,
            ),
            const SizedBox(height: 12),
            ClayButton(
              label: 'Type a code',
              color: ChalkColors.green,
              lip: ChalkColors.greenLip,
              onPressed: onType,
            ),
          ],
        ),
      ),
    );
  }
}
