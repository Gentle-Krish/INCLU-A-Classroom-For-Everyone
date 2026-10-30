import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../join/laptop_address.dart';
import '../theme/chalk_theme.dart';
import '../widgets/clay_bot.dart';
import '../widgets/clay_button.dart';
import '../widgets/cream_scaffold.dart';

class JoinScreen extends StatefulWidget {
  const JoinScreen({
    super.key,
    required this.onScan,
    required this.onSubmit,
    this.onSayAgain,
    this.knownName,
  });

  final VoidCallback onScan;
  final void Function(String room, LaptopAddress address, {String? name}) onSubmit;
  final VoidCallback? onSayAgain;
  final String? knownName;

  @override
  State<JoinScreen> createState() => _JoinScreenState();
}

class _JoinScreenState extends State<JoinScreen> {
  final _room = TextEditingController();
  final _address = TextEditingController();
  final _name = TextEditingController();
  final _roomFocus = FocusNode();

  @override
  void dispose() {
    _room.dispose();
    _address.dispose();
    _name.dispose();
    _roomFocus.dispose();
    super.dispose();
  }

  void _submit() {
    FocusManager.instance.primaryFocus?.unfocus();
    final room = _room.text.trim();
    if (!RegExp(r'^\d{4}$').hasMatch(room)) return;
    final address = parseLaptopAddress(_address.text);
    if (address == null) return;
    final typedName = _name.text.trim();
    if ((widget.knownName == null || widget.knownName!.trim().isEmpty) && typedName.isEmpty) {
      return;
    }
    widget.onSubmit(
      room,
      address,
      name: typedName.isEmpty ? null : typedName,
    );
  }

  @override
  Widget build(BuildContext context) {
    final ready = RegExp(r'^\d{4}$').hasMatch(_room.text.trim());
    final address = parseLaptopAddress(_address.text);
    return CreamScaffold(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 18, 24, 24),
        child: Column(
          children: [
            const ClayBot(size: 132),
            const SizedBox(height: 12),
            const Text('Join the class', style: chalkTitle, textAlign: TextAlign.center),
            const SizedBox(height: 6),
            const Text(
              "Pick how you'd like to jump in today",
              style: chalkSubtitle,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 18),
            ClayButton(
              label: 'Scan the board',
              icon: const Icon(Icons.qr_code_2, color: Colors.white, size: 26),
              onPressed: widget.onScan,
            ),
            const SizedBox(height: 12),
            ClayButton(
              label: 'I have a code',
              color: ChalkColors.creamButton,
              lip: ChalkColors.creamLip,
              foreground: ChalkColors.brownDeep,
              onPressed: () => _roomFocus.requestFocus(),
            ),
            if (widget.onSayAgain != null) ...[
              const SizedBox(height: 12),
              ClayButton(
                label: 'Say the code again',
                color: ChalkColors.green,
                lip: ChalkColors.greenLip,
                onPressed: widget.onSayAgain,
              ),
            ],
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
              decoration: BoxDecoration(
                color: ChalkColors.creamDeep,
                borderRadius: BorderRadius.circular(28),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x14000000),
                    blurRadius: 24,
                    offset: Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      _PeachDot(),
                      SizedBox(width: 8),
                      Text(
                        'TYPE IT INSTEAD',
                        style: TextStyle(
                          color: ChalkColors.brown,
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                          letterSpacing: 1.1,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  if (widget.knownName == null || widget.knownName!.trim().isEmpty) ...[
                    const _FieldLabel('YOUR NAME'),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _name,
                      textCapitalization: TextCapitalization.words,
                      onChanged: (_) => setState(() {}),
                      onSubmitted: (_) => _submit(),
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: ChalkColors.ink,
                      ),
                      decoration: const InputDecoration(
                        hintText: 'Priya',
                        contentPadding: EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],
                  const _FieldLabel('CLASS NUMBER'),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _room,
                    focusNode: _roomFocus,
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(4),
                    ],
                    onChanged: (_) => setState(() {}),
                    onSubmitted: (_) => _submit(),
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 2,
                      color: ChalkColors.ink,
                    ),
                    decoration: InputDecoration(
                      hintText: '4821',
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 14,
                      ),
                      suffixIcon: ready
                          ? const Padding(
                              padding: EdgeInsets.only(right: 8),
                              child: _ReadyChip(),
                            )
                          : null,
                      suffixIconConstraints: const BoxConstraints(
                        minWidth: 0,
                        minHeight: 0,
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const _FieldLabel('LAPTOP ADDRESS'),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _address,
                    keyboardType: TextInputType.url,
                    autocorrect: false,
                    onChanged: (_) => setState(() {}),
                    onSubmitted: (_) => _submit(),
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: ChalkColors.ink,
                    ),
                    decoration: InputDecoration(
                      hintText: '192.168.1.20:3000',
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 14,
                      ),
                      suffixIcon: address != null
                          ? const Padding(
                              padding: EdgeInsets.only(right: 10),
                              child: _CheckMark(),
                            )
                          : null,
                      suffixIconConstraints: const BoxConstraints(
                        minWidth: 0,
                        minHeight: 0,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  ClayButton(
                    label: 'Join  →',
                    color: ChalkColors.green,
                    lip: ChalkColors.greenLip,
                    onPressed: _submit,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),
            const Text(
              'Need help? Ask your teacher or look at the board',
              style: TextStyle(
                color: ChalkColors.brown,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: ChalkColors.brown,
        fontWeight: FontWeight.w800,
        fontSize: 12,
        letterSpacing: 1.1,
      ),
    );
  }
}

class _PeachDot extends StatelessWidget {
  const _PeachDot();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 10,
      height: 10,
      decoration: const BoxDecoration(
        color: ChalkColors.peach,
        shape: BoxShape.circle,
      ),
    );
  }
}

class _ReadyChip extends StatelessWidget {
  const _ReadyChip();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: ChalkColors.greenSoft,
        borderRadius: BorderRadius.circular(20),
      ),
      child: const Text(
        'Ready',
        style: TextStyle(
          color: ChalkColors.green,
          fontWeight: FontWeight.w800,
          fontSize: 14,
        ),
      ),
    );
  }
}

class _CheckMark extends StatelessWidget {
  const _CheckMark();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 28,
      height: 28,
      decoration: const BoxDecoration(
        color: ChalkColors.green,
        shape: BoxShape.circle,
      ),
      child: const Icon(Icons.check, color: Colors.white, size: 18),
    );
  }
}
