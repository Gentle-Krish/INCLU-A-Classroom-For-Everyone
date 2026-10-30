export interface AlgorithmLesson {
  title: string;
  markdown: string;
}

function lesson(title: string, lines: string[]): AlgorithmLesson {
  const steps = lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
  return {
    title,
    markdown: `## ${title}\n\nRead one step, then the next.\n\n${steps}`,
  };
}

/** A short trace for a named classroom algorithm. Null when the sentence is not one of these. */
export function algorithmLesson(prompt: string): AlgorithmLesson | null {
  const text = prompt.toLowerCase();
  const wantsSteps = /\b(algorithm|sort|search|trace|step by step|run this)\b/.test(text);
  if (!wantsSteps) return null;
  if (/\bbubble\b/.test(text)) {
    return lesson('Bubble sort', [
      'Start with 5, 1, 4, 2.',
      'Compare 5 and 1. 5 is larger, so they swap. The row is 1, 5, 4, 2.',
      'Compare 5 and 4. They swap. The row is 1, 4, 5, 2.',
      'Compare 5 and 2. They swap. The row is 1, 4, 2, 5. The 5 has bubbled to the end.',
      'Next pass: 1 and 4 stay. 4 and 2 swap. The row is 1, 2, 4, 5.',
      '4 and 5 are already in order. Nothing moves. The row is sorted: 1, 2, 4, 5.',
    ]);
  }
  if (/\binsertion\b/.test(text)) {
    return lesson('Insertion sort', [
      'Start with 4, 2, 7, 1. The first card, 4, is already in the sorted side.',
      'Pick up 2. It is smaller than 4, so it slides in front. The row is 2, 4, 7, 1.',
      'Pick up 7. It is already bigger than 4, so it stays. The row is 2, 4, 7, 1.',
      'Pick up 1. It slides past 7, 4, and 2. The row is 1, 2, 4, 7.',
    ]);
  }
  if (/\bbinary\b/.test(text)) {
    return lesson('Binary search for 16', [
      'The sorted row is 2, 5, 8, 12, 16, 23, 38. Look at the middle, which is 12.',
      '16 is bigger than 12, so throw away the left half. What is left is 16, 23, 38.',
      'The middle of what is left is 23. 16 is smaller, so throw away 23 and 38.',
      'Only 16 is left. That is the number. Found it.',
    ]);
  }
  if (/\blinear\b/.test(text)) {
    return lesson('Linear search for 4', [
      'The row is 7, 2, 4, 9. Check 7. That is not 4.',
      'Check 2. That is not 4.',
      'Check 4. That is the number. Stop. You do not need to look at 9.',
    ]);
  }
  return null;
}
