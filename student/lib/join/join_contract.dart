/// Names the laptop and the phone agree on. Do not rename them.
const String chalkSocketPath = '/socket.io';
const int chalkBeaconPort = 3031;

/// Socket.IO port when a typed address has no `:port`.
/// The dev board binds 3000 and prints `host:port`. Electron prints `:3030`.
/// Typing the address exactly as the board shows it overrides this default.
const int chalkDefaultSocketPort = 3000;

const String chalkStudentHello = 'student-hello';
const String chalkClassWelcome = 'class-welcome';
const String chalkClassRoster = 'class-roster';

/// Server tells phones in the room that the teacher pressed Start Class.
/// Payload: `{ "roomId": "<four digit room>" }`.
const String chalkClassStarted = 'class-started';

/// Laptop publishes the quest list. Payload has `quests` and `liveQuestId`.
const String chalkQuestList = 'quest-list';

/// Phone reports one chosen option. The laptop counts it.
const String chalkQuestAnswer = 'quest-answer';

/// One typed line from a student who is not speaking.
const String chalkStudentAsk = 'student-ask';

/// The laptop model's answer to that line.
const String chalkStudentReply = 'student-reply';

/// Lesson text the teacher saved.
const String chalkClassNotes = 'class-notes';

/// UDP 3031 payload, UTF-8 JSON. The phone uses the sender address as the host
/// and `port` (also `socketPort`) as the Socket.IO port.
/// Laptop shape: {"room":"4821","classNumber":"4821","port":3000}
const String chalkBeaconRoomKey = 'room';
const String chalkBeaconPortKey = 'port';
