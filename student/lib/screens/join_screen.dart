import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../join/beacon_listener.dart';
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
    this.nearbyClasses,
    this.onSelectNearby,
  });

  final VoidCallback onScan;
  final void Function(String room, LaptopAddress? address, {String? name}) onSubmit;
  final VoidCallback? onSayAgain;
  final String? knownName;
  final List<NearbyClass>? nearbyClasses;
  final void Function(NearbyClass room)? onSelectNearby;

  @override
  State<JoinScreen> createState() => _JoinScreenState();
}

class _JoinScreenState extends State<JoinScreen> {
  final _room = TextEditingController();
  final _address = TextEditingController();
  final _name = TextEditingController();
  final _roomFocus = FocusNode();
  bool _showAdvancedIp = false;

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
    final typedName = _name.text.trim();
    if ((widget.knownName == null || widget.knownName!.trim().isEmpty) && typedName.isEmpty) {
      return;
    }
    final address = _address.text.trim().isNotEmpty ? parseLaptopAddress(_address.text) : null;
    widget.onSubmit(
      room,
      address,
      name: typedName.isEmpty ? null : typedName,
    );
  }

  @override
  Widget build(BuildContext context) {
    final ready = RegExp(r'^\d{4}$').hasMatch(_room.text.trim());
    final hasName = (widget.knownName != null && widget.knownName!.trim().isNotEmpty) || _name.text.trim().isNotEmpty;
    final canSubmit = ready && hasName;

    return CreamScaffold(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 18, 24, 24),
        child: Column(
          children: [
            Image.asset(
              'assets/logo.png',
              height: 42,
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => const SizedBox.shrink(),
            ),
            const SizedBox(height: 14),
            const ClayBot(size: 118),
            const SizedBox(height: 12),
            const Text('Join the class', style: chalkTitle, textAlign: TextAlign.center),
            const SizedBox(height: 6),
            const Text(
              "Pick how you'd like to jump in today",
              style: chalkSubtitle,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 18),

            // Network suggestions when whiteboards are discovered on this Wi-Fi
            if (widget.nearbyClasses != null && widget.nearbyClasses!.isNotEmpty) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: ChalkColors.creamDeep,
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: ChalkColors.green.withOpacity(0.4), width: 1.5),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x10000000),
                      blurRadius: 18,
                      offset: Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.wifi, color: ChalkColors.green, size: 20),
                        const SizedBox(width: 8),
                        const Text(
                          'WHITEBOARD FOUND ON THIS WI-FI',
                          style: TextStyle(
                            color: ChalkColors.green,
                            fontWeight: FontWeight.w800,
                            fontSize: 12,
                            letterSpacing: 1.1,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    for (final item in widget.nearbyClasses!) ...[
                      ClayButton(
                        label: 'Connect to Class ${item.room}',
                        color: ChalkColors.green,
                        lip: ChalkColors.greenLip,
                        onPressed: () {
                          if (widget.onSelectNearby != null) {
                            widget.onSelectNearby!(item);
                          } else {
                            widget.onSubmit(item.room, LaptopAddress(host: item.host, port: item.port));
                          }
                        },
                      ),
                      const SizedBox(height: 8),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

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
                        'TYPE CODE TO JOIN',
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
                  const SizedBox(height: 12),

                  // Discreet optional manual IP toggle for advanced setups
                  InkWell(
                    onTap: () => setState(() => _showAdvancedIp = !_showAdvancedIp),
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          Icon(
                            _showAdvancedIp ? Icons.arrow_drop_down : Icons.arrow_right,
                            color: ChalkColors.brown.withOpacity(0.6),
                            size: 20,
                          ),
                          Text(
                            _showAdvancedIp ? 'Hide custom laptop IP' : 'Advanced: manual IP (optional)',
                            style: TextStyle(
                              color: ChalkColors.brown.withOpacity(0.7),
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (_showAdvancedIp) ...[
                    const SizedBox(height: 8),
                    const _FieldLabel('LAPTOP ADDRESS (OPTIONAL)'),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _address,
                      keyboardType: TextInputType.url,
                      autocorrect: false,
                      onChanged: (_) => setState(() {}),
                      onSubmitted: (_) => _submit(),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: ChalkColors.ink,
                      ),
                      decoration: const InputDecoration(
                        hintText: 'e.g. 192.168.1.20:3000',
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: 14,
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: 16),
                  ClayButton(
                    label: 'Join  →',
                    color: canSubmit ? ChalkColors.green : ChalkColors.creamButton,
                    lip: canSubmit ? ChalkColors.greenLip : ChalkColors.creamLip,
                    foreground: canSubmit ? Colors.white : ChalkColors.brownDeep,
                    onPressed: canSubmit ? _submit : null,
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
