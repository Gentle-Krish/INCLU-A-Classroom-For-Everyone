export const BOARD_COULD_NOT_ANSWER = 'I could not answer that just now. Ask your teacher.';

/** Two or three sentences for a phone. The lesson is included when the teacher has saved notes. */
export function studentAnswerPrompt(question: string, notes: string): string {
  const lesson = notes.trim().slice(0, 4000) || 'The class has not saved notes yet.';
  return `You are the class board. Answer the student in two or three short sentences. Use the lesson when it helps. Do not mention being a model.\n\nLesson:\n${lesson}\n\nQuestion:\n${question.trim()}`;
}

/** Drop a leaked thinking channel and keep the reply short enough for a phone. */
export function readableStudentAnswer(raw: string): string {
  let text = raw.trim();
  const end = '<channel|>';
  const cut = text.lastIndexOf(end);
  if (cut !== -1) text = text.slice(cut + end.length).trim();
  text = text.replace(/^["']+|["']+$/g, '').trim();
  if (!text) return BOARD_COULD_NOT_ANSWER;
  return text.slice(0, 600);
}
