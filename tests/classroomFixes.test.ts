import { describe, expect, it } from 'vitest';
import { algorithmLesson } from '../utils/algorithmTrace';
import { scrollBoardPage } from '../utils/boardScroll';
import { equationLine, penFontSize, penLine } from '../utils/boardIntent';
import { visiblePageFrame } from '../utils/boardScroll';
import { readableStudentAnswer, studentAnswerPrompt, BOARD_COULD_NOT_ANSWER } from '../utils/classAnswer';
import { attachAskAnswer, emptyQuestBook } from '../utils/questRoom';
import { evaluateJevSystemOne } from '../hooks/useGeminiBrain';

describe('board intents', () => {
  it('pulls the words after a pen request', () => {
    expect(penLine('use the pen to write Photosynthesis makes food')).toBe('Photosynthesis makes food');
    expect(penLine('draw a circle')).toBeNull();
    const page = penLine(`use the pen to write ${'leaf '.repeat(80)}`);
    expect(page && page.length).toBeGreaterThan(280);
  });

  it('opens a new board page when asked to open a new page', () => {
    let opened = 0;
    const store = { addPage: () => { opened += 1; } };
    for (const phrase of ['open a new page', 'open new page', 'please open a new page', 'add page']) {
      const result = evaluateJevSystemOne(phrase, store, null);
      expect(result.handled).toBe(true);
      expect(result.actionTaken).toBe('ADD_PAGE');
    }
    expect(opened).toBe(4);
    expect(evaluateJevSystemOne('explain photosynthesis', store, null).handled).toBe(false);
  });

  it('sizes a pen page to the sheet the teacher is looking at', () => {
    const frame = visiblePageFrame({
      width: 1400,
      height: 900,
      viewportTransform: [1, 0, 0, 1, 0, 0],
    });
    expect(frame.width).toBe(1344);
    expect(frame.height).toBe(844);
    const shortWriting = penFontSize('The leaf drinks sunlight.', frame.width, frame.height);
    const longWriting = penFontSize('leaf '.repeat(500), frame.width, frame.height);
    expect(shortWriting).toBeGreaterThan(longWriting);
  });

  it('pulls an equation when one was asked for', () => {
    expect(equationLine('write the equation E = mc^2')).toBe('E = mc^2');
    expect(equationLine('explain photosynthesis')).toBeNull();
  });

  it('traces bubble sort as numbered steps', () => {
    const lesson = algorithmLesson('try run bubble sort');
    expect(lesson?.title).toBe('Bubble sort');
    expect(lesson?.markdown).toContain('1, 2, 4, 5');
    expect(algorithmLesson('what is a leaf')).toBeNull();
  });

  it('scrolls the words inside a page', () => {
    document.body.innerHTML = '<div id="page"><div data-scroll-body></div></div>';
    const body = document.querySelector('[data-scroll-body]') as HTMLElement;
    scrollBoardPage(document.getElementById('page') as HTMLElement, 80, 0);
    expect(body.scrollTop).toBe(80);
  });

  it('opens the quiz tool without calling the model', () => {
    let opened = false;
    const result = evaluateJevSystemOne('open the quiz', {
      isQuizOpen: false,
      toggleQuiz: () => { opened = true; },
    }, null);
    expect(result.handled).toBe(true);
    expect(result.actionTaken).toBe('TOGGLE_QUIZ');
    expect(opened).toBe(true);
  });
});

describe('student answers', () => {
  it('asks the laptop model in short sentences and hides an empty reply', () => {
    const prompt = studentAnswerPrompt('Why does a leaf look green?', 'Chlorophyll reflects green light.');
    expect(prompt).toContain('Chlorophyll reflects green light.');
    expect(prompt).toContain('Why does a leaf look green?');
    expect(readableStudentAnswer('')).toBe(BOARD_COULD_NOT_ANSWER);
    expect(readableStudentAnswer('thinking<channel|>Because chlorophyll reflects green.')).toBe('Because chlorophyll reflects green.');
  });

  it('attaches an answer onto the question the student sent', () => {
    const book = attachAskAnswer(emptyQuestBook(), 'missing', 'nope');
    expect(book.asks).toEqual([]);
    const withAsk = {
      ...emptyQuestBook(),
      asks: [{ id: 'a1', displayName: 'Priya', text: 'Why?', lessonPart: 'Class' }],
    };
    expect(attachAskAnswer(withAsk, 'a1', 'Because the leaf uses light.').asks[0].answer).toBe('Because the leaf uses light.');
  });
});
