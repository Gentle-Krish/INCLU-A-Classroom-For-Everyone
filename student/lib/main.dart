import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'join_flow.dart';
import 'theme/chalk_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations(const [
    DeviceOrientation.portraitUp,
  ]);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: ChalkColors.cream,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const ChalkStudentApp());
}

class ChalkStudentApp extends StatelessWidget {
  const ChalkStudentApp({super.key, this.home});

  /// When set, the join flow is not started. Widget tests use this for the name screen.
  final Widget? home;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Inclu',
      debugShowCheckedModeBanner: false,
      theme: chalkTheme(),
      home: home ?? const JoinFlow(),
    );
  }
}
