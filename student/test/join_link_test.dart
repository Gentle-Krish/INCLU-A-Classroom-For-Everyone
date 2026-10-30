import 'package:chalk_student/join/join_link.dart';
import 'package:chalk_student/join/laptop_address.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses a chalk join link with host, port, and room', () {
    final link = parseChalkJoin(
      'chalk://join?host=192.168.1.20&port=3030&room=k3m9p2q',
    );
    expect(link, isNotNull);
    expect(link!.host, '192.168.1.20');
    expect(link.port, 3030);
    expect(link.room, 'k3m9p2q');
    expect(link.hasEndpoint, isTrue);
  });

  test('rejects http and https instead of opening them', () {
    expect(parseChalkJoin('http://192.168.1.20:3030/?room=4821'), isNull);
    expect(parseChalkJoin('https://192.168.1.20:3030/?room=4821'), isNull);
    expect(
      mergeJoinTarget(uri: Uri.parse('http://192.168.1.20:3030/?room=4821')),
      isNull,
    );
    expect(
      mergeJoinTarget(uri: Uri.parse('https://example.com/join?room=4821')),
      isNull,
    );
    expect(parseLaptopAddress('http://192.168.1.20'), isNull);
    expect(parseLaptopAddress('https://192.168.1.20:3030'), isNull);
  });

  test('assistant link is the class number without a host', () {
    final link = parseChalkJoin('chalk://join?room=4821');
    expect(link, isNotNull);
    expect(link!.room, '4821');
    expect(link.hasEndpoint, isFalse);
  });

  test('assistant extra supplies the four digits', () {
    final link = mergeJoinTarget(code: '4821');
    expect(link, isNotNull);
    expect(link!.room, '4821');
    expect(link.hasEndpoint, isFalse);
  });

  test('a link without a room is ignored', () {
    expect(
      parseChalkJoin('chalk://join?host=192.168.1.20&port=3030'),
      isNull,
    );
  });

  test('typed laptop address defaults the port and keeps an explicit one', () {
    final plain = parseLaptopAddress('192.168.1.20');
    expect(plain?.host, '192.168.1.20');
    expect(plain?.port, 3000);
    final board = parseLaptopAddress('192.168.1.20:3000');
    expect(board?.host, '192.168.1.20');
    expect(board?.port, 3000);
    final explicit = parseLaptopAddress('192.168.1.20:3040');
    expect(explicit?.host, '192.168.1.20');
    expect(explicit?.port, 3040);
  });
}
