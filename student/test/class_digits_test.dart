import 'package:chalk_student/join/class_digits.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('reads four spoken or typed digits', () {
    expect(extractFourDigits('4821'), '4821');
    expect(extractFourDigits('four eight two one'), '4821');
    expect(extractFourDigits('Four Eight Two One'), '4821');
    expect(extractFourDigits('4 8 2 1'), '4821');
    expect(extractFourDigits('my class is 4821 please'), '4821');
    expect(extractFourDigits('my class is four eight two one thanks'), '4821');
  });

  test('ignores hearings that are not four digits', () {
    expect(extractFourDigits(''), isNull);
    expect(extractFourDigits('12'), isNull);
    expect(extractFourDigits('482'), isNull);
    expect(extractFourDigits('48210'), isNull);
    expect(extractFourDigits('four eight two'), isNull);
    expect(extractFourDigits('hello there'), isNull);
  });
}
