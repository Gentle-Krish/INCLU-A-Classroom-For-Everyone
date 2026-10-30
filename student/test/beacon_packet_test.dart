import 'package:chalk_student/join/beacon_packet.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('reads the class number and socket port from the beacon', () {
    final packet = parseBeacon('{"room":"4821","classNumber":"4821","port":3000}');
    expect(packet?.room, '4821');
    expect(packet?.port, 3000);

    final aliased = parseBeacon('{"roomId":4821,"socketPort":"3030"}');
    expect(aliased?.room, '4821');
    expect(aliased?.port, 3030);
  });

  test('drops a beacon with no port', () {
    expect(parseBeacon('{"room":"4821"}'), isNull);
    expect(parseBeacon(''), isNull);
  });
}
