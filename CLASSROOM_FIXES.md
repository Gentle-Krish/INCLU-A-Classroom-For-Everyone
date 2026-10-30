# Classroom problems from the laptop and the phones

These are the problems from a real class, in the order they showed up.

1. **The class code changes when the laptop reloads.** A dropped connection and a refresh minted a new four-digit code. Students holding the old code could not join.
2. **A class that is already on the network should show up.** If one class is running, the phone should show it. If several are running, the student can still pick or say a code.
3. **The phone asked for the code twice, then skipped the name.** After two listens it opened a screen that looked like a website address, with no name field and no way to say the code again.
4. **The board could not do the teaching jobs.** It would not write an equation, would not use the pen, and wrote quiz lines that did not sound like a teacher. Shapes and fonts did work.
5. **Pictures.** Gemma, the model on the laptop, cannot draw pictures. It only writes text. A picture model is a different program. Ollama’s picture models were taken back out in August 2026, and the small ones that fit a laptop GPU (SDXL Turbo on about 6–8 GB, or FLUX.2 Klein 4B if the card has more room) are not wired in here.
6. **Notes.** Saving should put the lesson on the students’ phones. The Save menu must not offer “Download project file (.Chalk)”.
7. **Quests.** Questions should sound like a person. After the teacher ends a quest, the phone should stop showing it. Ask the board should be a chat, and the model installed on the laptop should answer.
8. **Computer science on the board.** “Run this algorithm” should show the steps, not a single shape.
9. **Classroom tools.** Quiz, timer, calculator, notes, attendance, the periodic table, and the math graph should open when the teacher asks. Bigger lesson tools still go through the model, which is slow on the small laptop model.

## What changed

- The laptop keeps the same class code in the browser until the teacher clears site data.
- The phone listens on the network first and lists any class it hears. It asks for the code once, then offers “Say the code again”, and it asks for a name before joining.
- Save publishes the lesson notes to phones and no longer downloads a project file.
- A closed quest disappears from the phone. Ask the board stays open and shows the laptop model’s answer.
- “Write the equation …”, “use the pen to write …”, “run bubble sort”, and “open the quiz” / “open the math graph” happen on the board without waiting on a long model reply.
