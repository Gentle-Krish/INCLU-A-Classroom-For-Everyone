import "dotenv/config";

// Suppress @google/genai SDK internal warning about non-text function-call parts.
// The SDK logs this unconditionally at response construction — we extract parts
// directly from candidates[0].content.parts so this warning is a false positive.
const _consoleWarn = console.warn.bind(console);
console.warn = (...args: any[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('non-text parts') && msg.includes('functionCall')) return;
  _consoleWarn(...args);
};

import express from "express";
import path from "path";
import fs from "fs";

import { createServer } from "http";
import { Server } from "socket.io";
import os from "os";
import dgram from "node:dgram";
import { aiRouter } from "./server/aiRouter";
import { answerStudent } from "./server/classAnswer";
import { CONFIG } from "./constants";
import { ClientToServerEvents, RoomState, ServerToClientEvents, SocketData, SocketInterServerEvents } from "./types";
import { createLogger } from "./utils/logger";
import {
  buildClassBeacon,
  CLASS_BEACON_INTERVAL_MS,
  CLASS_BEACON_PORT,
  connectStudent,
  disconnectStudent,
  isAllowedSocketOrigin,
  lanBroadcastAddresses,
  listLanIpv4,
  normalizeStudentHello,
  pickLanIpv4,
  publicRoster,
} from "./utils/classRoom";
import {
  addStudentAsk,
  applyQuestAnswer,
  attachAskAnswer,
  closeLiveQuest,
  emptyQuestBook,
  normalizeStudentAsk,
  openQuestBook,
  publicQuestList,
  publicScores,
  publicTally,
} from "./utils/questRoom";
import { parseQuestPack, publishQuest } from "./utils/questSchema";
import type { ClassQuestBook } from "./types";

const logger = createLogger('server');
// Rooms file: configurable via env, defaults to cwd.
// On ephemeral hosts (Render, Railway) this resets on deploy — that is expected
// for a demo environment. Point ROOMS_FILE_PATH to a mounted volume for persistence.
const ROOMS_FILE = process.env.ROOMS_FILE_PATH ||
  path.join(process.cwd(), CONFIG.server.roomsPersistenceFile);

let saveTimeout: NodeJS.Timeout | null = null;
let isSaving = false;
let pendingSave = false;

function saveRooms(rooms: Map<string, RoomState>) {
  if (isSaving) {
    pendingSave = true;
    return;
  }

  if (saveTimeout) return;

  saveTimeout = setTimeout(async () => {
    saveTimeout = null;
    isSaving = true;
    
    try {
      const data = JSON.stringify(Array.from(rooms.entries()));
      const tempFile = `${ROOMS_FILE}.tmp`;
      await fs.promises.writeFile(tempFile, data, "utf8");
      await fs.promises.rename(tempFile, ROOMS_FILE);
    } catch (e) {
      logger.error("Async save rooms failed", e);
    } finally {
      isSaving = false;
      if (pendingSave) {
        pendingSave = false;
        saveRooms(rooms);
      }
    }
  }, 2000); // 2-second write coalescing debounce
}

function loadRooms(): Map<string, RoomState> {
  try {
    if (fs.existsSync(ROOMS_FILE)) {
      const data = fs.readFileSync(ROOMS_FILE, 'utf8');
      const rooms = new Map<string, RoomState>(JSON.parse(data));
      for (const room of rooms.values()) {
        if (!room.students || typeof room.students !== "object") room.students = {};
        for (const student of Object.values(room.students)) {
          student.connected = false;
          student.socketId = "";
        }
      }
      return rooms;
    }
  } catch (e) {
    logger.error("Failed to load rooms", e);
  }
  return new Map();
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.SERVER_PORT || CONFIG.server.defaultPort);

  // Electron sets NODE_ENV=production. A phone has no Origin, or a LAN Origin.
  // Allow those, plus ALLOWED_ORIGIN when one is configured. Development stays open.
  const allowedOriginEnv = process.env.ALLOWED_ORIGIN;

  const httpServer = createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents, SocketInterServerEvents, SocketData>(httpServer, {
    cors: {
      origin: (origin, callback) => {
        const allowed = isAllowedSocketOrigin(origin, {
          nodeEnv: process.env.NODE_ENV,
          allowedOrigin: allowedOriginEnv,
        });
        callback(allowed ? null : new Error("Origin not allowed"), allowed);
      },
      methods: ["GET", "POST"]
    }
  });

  // State management for canvas
  const rooms = loadRooms();
  const boardSocketsByRoom = new Map<string, Set<string>>();
  let boundPort = PORT;

  const ensureRoom = (roomId: string) => {
    let room = rooms.get(roomId);
    let created = false;
    if (!room) {
      room = { state: [], viewports: {}, domElements: {}, lastViewport: null, students: {} };
      rooms.set(roomId, room);
      created = true;
    }
    if (!room.students) room.students = {};
    if (!room.questBook) room.questBook = emptyQuestBook();
    return { room, created };
  };

  const bookOf = (room: { questBook?: ClassQuestBook }): ClassQuestBook => {
    if (!room.questBook) room.questBook = emptyQuestBook();
    return room.questBook;
  };

  const emitToBoards = (roomId: string, event: "quest-scores" | "student-question" | "student-questions" | "student-reply", payload: unknown) => {
    const members = boardSocketsByRoom.get(roomId);
    if (!members) return;
    for (const socketId of members) io.to(socketId).emit(event, payload as never);
  };

  const emitQuestBoard = (roomId: string, book: ClassQuestBook, target?: { emit: (event: string, payload: unknown) => void }) => {
    const list = publicQuestList(book);
    const tally = publicTally(book);
    const scores = publicScores(book);
    if (target) {
      target.emit("quest-list", list);
      if (tally) target.emit("quest-tally", tally);
      if (scores) target.emit("quest-scores", scores);
      target.emit("student-questions", book.asks);
      return;
    }
    io.to(roomId).emit("quest-list", list);
    if (tally) io.to(roomId).emit("quest-tally", tally);
    if (scores) emitToBoards(roomId, "quest-scores", scores);
  };

  const trackBoard = (roomId: string, socketId: string) => {
    let members = boardSocketsByRoom.get(roomId);
    if (!members) {
      members = new Set();
      boardSocketsByRoom.set(roomId, members);
    }
    members.add(socketId);
  };

  const untrackBoard = (socketId: string) => {
    for (const [roomId, members] of boardSocketsByRoom) {
      members.delete(socketId);
      if (members.size === 0) boardSocketsByRoom.delete(roomId);
    }
  };

  const startClassBeacon = (socketPort: number) => {
    const udp = dgram.createSocket({ type: "udp4", reuseAddr: true });
    let ready = false;
    udp.on("error", (err) => {
      ready = false;
      logger.error("Class beacon error", err);
    });
    udp.bind(CLASS_BEACON_PORT, () => {
      try {
        udp.setBroadcast(true);
        ready = true;
        logger.info("Class beacon listening", { port: CLASS_BEACON_PORT });
      } catch (err) {
        logger.error("Class beacon could not enable broadcast", err);
      }
    });
    setInterval(() => {
      if (!ready) return;
      const classNumbers = [...boardSocketsByRoom.keys()].filter((id) => /^\d{4}$/.test(id));
      if (classNumbers.length === 0) return;
      const targets = lanBroadcastAddresses(os.networkInterfaces() || {});
      for (const classNumber of classNumbers) {
        const packet = Buffer.from(JSON.stringify(buildClassBeacon(classNumber, socketPort)));
        for (const target of targets) {
          udp.send(packet, CLASS_BEACON_PORT, target, (err) => {
            if (err) logger.error("Class beacon send failed", err);
          });
        }
      }
    }, CLASS_BEACON_INTERVAL_MS);
  };

  io.on("connection", (socket) => {
    logger.info("Client connected", { socketId: socket.id });

    socket.on("join-room", (roomId: string) => {
      if (socket.data.role === "student") return;
      if (typeof roomId !== "string" || !roomId.trim() || roomId.length > 128) return;
      const id = roomId.trim();
      socket.data.role = "board";
      socket.data.roomId = id;
      socket.join(id);
      const { room: roomData, created } = ensureRoom(id);
      if (created) saveRooms(rooms);
      trackBoard(id, socket.id);
      socket.emit("canvas-init", roomData.state || []);
      if (roomData.lastViewport) {
        socket.emit("viewport-update", { socketId: 'host', viewport: roomData.lastViewport });
      }
      if (roomData.domElements) {
        socket.emit("dom-elements-init", roomData.domElements);
      }
      socket.emit("class-roster", publicRoster(roomData.students));
      emitQuestBoard(id, bookOf(roomData), socket);

      logger.info("Socket joined room", { socketId: socket.id, roomId: id });
    });

    socket.on("student-hello", (payload) => {
      if (socket.data.role === "board") return;
      const hello = normalizeStudentHello(payload);
      if (!hello) {
        logger.info("Rejected student-hello", { socketId: socket.id });
        return;
      }
      const { room } = ensureRoom(hello.roomId);
      room.students = connectStudent(room.students || {}, hello, socket.id);
      socket.data.role = "student";
      socket.data.studentId = hello.studentId;
      socket.data.roomId = hello.roomId;
      socket.join(hello.roomId);
      socket.emit("class-welcome", {
        roomId: hello.roomId,
        studentId: hello.studentId,
        displayName: hello.displayName,
      });
      if (room.started) {
        socket.emit("class-started", { roomId: hello.roomId });
      }
      socket.emit("quest-list", publicQuestList(bookOf(room)));
      if (room.lessonNotes) {
        socket.emit("class-notes", { text: room.lessonNotes });
      }
      io.to(hello.roomId).emit("class-roster", publicRoster(room.students));
      saveRooms(rooms);
      logger.info("Student joined class", { socketId: socket.id, roomId: hello.roomId, studentId: hello.studentId });
    });

    socket.on("start-class", (roomId: string) => {
      if (socket.data.role !== "board") return;
      if (typeof roomId !== "string" || !roomId.trim() || roomId.length > 128) return;
      const id = roomId.trim();
      if (socket.data.roomId !== id) return;
      const { room } = ensureRoom(id);
      room.started = true;
      saveRooms(rooms);
      io.to(id).emit("class-started", { roomId: id });
      logger.info("Class started", { socketId: socket.id, roomId: id });
    });

    socket.on("open-quest", (payload) => {
      if (socket.data.role !== "board") return;
      if (!payload || typeof payload.roomId !== "string") return;
      const id = payload.roomId.trim();
      if (!id || socket.data.roomId !== id) return;
      let pack;
      try {
        pack = publishQuest(parseQuestPack(payload.quest));
      } catch {
        logger.info("Rejected quest", { roomId: id });
        return;
      }
      const { room } = ensureRoom(id);
      room.questBook = openQuestBook(bookOf(room), pack);
      saveRooms(rooms);
      emitQuestBoard(id, room.questBook);
      logger.info("Quest opened", { roomId: id, questId: pack.id });
    });

    socket.on("close-quest", (payload) => {
      if (socket.data.role !== "board") return;
      if (!payload || typeof payload.roomId !== "string") return;
      const id = payload.roomId.trim();
      if (!id || socket.data.roomId !== id) return;
      const { room } = ensureRoom(id);
      room.questBook = closeLiveQuest(bookOf(room));
      saveRooms(rooms);
      emitQuestBoard(id, room.questBook);
      logger.info("Quest closed", { roomId: id });
    });

    socket.on("quest-answer", (payload) => {
      if (socket.data.role !== "student" || !socket.data.roomId || !socket.data.studentId) return;
      const { room } = ensureRoom(socket.data.roomId);
      const student = room.students?.[socket.data.studentId];
      if (!student || !payload) return;
      const result = applyQuestAnswer(bookOf(room), {
        questId: String(payload.questId ?? ""),
        studentId: student.studentId,
        displayName: student.displayName,
        questionIndex: payload.questionIndex,
        optionIndex: payload.optionIndex,
        mode: payload.mode,
        score: payload.score,
        finished: payload.finished,
        runId: String(payload.runId ?? ""),
      });
      if (!result.changed) return;
      room.questBook = result.book;
      saveRooms(rooms);
      if (result.tally) {
        const tally = publicTally(result.book);
        if (tally) io.to(socket.data.roomId).emit("quest-tally", tally);
      }
      if (result.scores) {
        const scores = publicScores(result.book);
        if (scores) emitToBoards(socket.data.roomId, "quest-scores", scores);
      }
    });

    socket.on("student-ask", (payload) => {
      if (socket.data.role !== "student" || !socket.data.roomId || !socket.data.studentId) return;
      const { room } = ensureRoom(socket.data.roomId);
      const student = room.students?.[socket.data.studentId];
      if (!student) return;
      const ask = normalizeStudentAsk(payload, student);
      if (!ask) return;
      room.questBook = addStudentAsk(bookOf(room), ask);
      saveRooms(rooms);
      emitToBoards(socket.data.roomId, "student-question", ask);
      const roomId = socket.data.roomId;
      const askId = ask.id;
      const notes = room.lessonNotes || "";
      void answerStudent(ask.text, notes).then((answer) => {
        const current = rooms.get(roomId);
        if (!current) return;
        current.questBook = attachAskAnswer(bookOf(current), askId, answer);
        saveRooms(rooms);
        socket.emit("student-reply", { id: askId, answer });
        emitToBoards(roomId, "student-reply", { id: askId, answer });
      });
      logger.info("Student asked", { roomId: socket.data.roomId });
    });

    socket.on("class-notes", (payload) => {
      if (socket.data.role !== "board" || !socket.data.roomId) return;
      if (!payload || typeof payload.roomId !== "string" || payload.roomId.trim() !== socket.data.roomId) return;
      const text = String(payload.text ?? "").replace(/\u0000/g, "").trim().slice(0, 8000);
      const { room } = ensureRoom(socket.data.roomId);
      room.lessonNotes = text;
      saveRooms(rooms);
      io.to(socket.data.roomId).emit("class-notes", { text });
      logger.info("Class notes saved", { roomId: socket.data.roomId, chars: text.length });
    });

    // Receive full or incremental canvas updates
    socket.on("canvas-update", ({ roomId, data }) => {
      if (socket.data.role === "student") return;
      if (typeof roomId !== "string" || !roomId.trim() || roomId.length > 128) return;
      const room = rooms.get(roomId);
      if (room) {
        room.state = data;
        saveRooms(rooms);
      }
      socket.to(roomId).emit("canvas-update", data);
    });

    // Receive incremental canvas object delta updates
    socket.on("canvas-delta", ({ roomId, delta }) => {
      if (socket.data.role === "student") return;
      if (typeof roomId !== "string" || !roomId.trim() || roomId.length > 128 || !delta) return;
      const room = rooms.get(roomId);
      if (room) {
        if (room.state && !Array.isArray(room.state)) {
          const stateObj = room.state as Record<string, any>;
          if (!stateObj.objects) {
            stateObj.objects = [];
          }
          const objects = stateObj.objects as any[];
          
          if (delta.action === "add" || delta.action === "modify") {
            const idx = objects.findIndex((o: any) => o.id === delta.objectId);
            if (idx >= 0) {
              objects[idx] = delta.objectData;
            } else {
              objects.push(delta.objectData);
            }
          } else if (delta.action === "remove") {
            stateObj.objects = objects.filter((o: any) => o.id !== delta.objectId);
          }
        } else if (Array.isArray(room.state)) {
          const objects = room.state as any[];
          if (delta.action === "add" || delta.action === "modify") {
            const idx = objects.findIndex((o: any) => o.id === delta.objectId);
            if (idx >= 0) {
              objects[idx] = delta.objectData;
            } else {
              objects.push(delta.objectData);
            }
          } else if (delta.action === "remove") {
            room.state = objects.filter((o: any) => o.id !== delta.objectId);
          }
        }
        saveRooms(rooms);
      }
      socket.to(roomId).emit("canvas-delta", delta);
    });

    // Receive viewport updates
    socket.on("viewport-update", ({ roomId, viewport }) => {
      if (socket.data.role === "student") return;
      if (typeof roomId !== "string" || !roomId.trim() || roomId.length > 128 || !viewport) return;
      const room = rooms.get(roomId);
      if (room) {
        room.viewports[socket.id] = viewport;
        room.lastViewport = viewport;
        saveRooms(rooms);
      }
      socket.to(roomId).emit("viewport-update", {
        socketId: socket.id,
        viewport
      });
    });

    socket.on("dom-elements-update", ({ roomId, domElements }) => {
      if (socket.data.role === "student") return;
      if (typeof roomId !== "string" || !roomId.trim() || roomId.length > 128 || !domElements || typeof domElements !== "object") return;
      const room = rooms.get(roomId);
      if (room) {
        room.domElements = domElements;
        saveRooms(rooms);
      }
      socket.to(roomId).emit("dom-elements-update", domElements);
    });

    socket.on("disconnect", () => {
      untrackBoard(socket.id);
      if (socket.data.role === "student" && socket.data.roomId && socket.data.studentId) {
        const room = rooms.get(socket.data.roomId);
        if (room?.students) {
          room.students = disconnectStudent(room.students, socket.data.studentId, socket.id);
          saveRooms(rooms);
          io.to(socket.data.roomId).emit("class-roster", publicRoster(room.students));
        }
      }
      logger.info("Client disconnected", { socketId: socket.id });
    });
  });

  // API routes FIRST
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      env: process.env.NODE_ENV || 'development',
      aiMode: process.env.AI_MODE || 'auto',
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  app.get("/api/network-info", (_req, res) => {
    const interfaces = os.networkInterfaces() || {};
    const addresses = listLanIpv4(interfaces);
    const primaryIp = pickLanIpv4(interfaces) || "localhost";

    res.json({
      primaryIp,
      addresses,
      port: boundPort,
      primaryUrl: `http://${primaryIp}:${boundPort}`,
      hostname: os.hostname()
    });
  });

  app.post("/api/log-error", express.json({ limit: "1mb" }), (req, res) => {
    logger.warn("[Client Error Log]", req.body);
    res.status(200).json({ ok: true });
  });

  app.get("/download", (_req, res) => {
    const localExe = path.join(process.cwd(), "dist-release", "Inclu Setup 1.0.0.exe");
    const legacyExe = path.join(process.cwd(), "dist-release", "Chalk Setup 1.0.0.exe");
    if (fs.existsSync(localExe)) {
      return res.download(localExe, "Inclu-Setup-1.0.0.exe");
    }
    if (fs.existsSync(legacyExe)) {
      return res.download(legacyExe, "Inclu-Setup-1.0.0.exe");
    }
    res.status(404).type("text/plain").send("No Inclu installer has been built yet.");
  });

  app.use("/api/ai", aiRouter);

  app.get('/setup', (_req, res) => {
    const setupPath = process.env.INCLU_SETUP_HTML
      || process.env.CHALK_SETUP_HTML
      || path.join(process.cwd(), 'electron', 'setup.html');
    if (!fs.existsSync(setupPath)) {
      res.status(404).type('text/plain').send('Inclu setup page was not found.');
      return;
    }
    res.sendFile(setupPath);
  });

  // Vite middleware for development (or fallback if dist/index.html is not built yet)
  const distPath = process.env.APP_DIST_PATH || path.join(process.cwd(), 'dist');
  const hasDistBuild = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV !== "production" || !hasDistBuild) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    // Ensure SPA route requests (like /app) serve the transformed HTML shell
    app.use(async (req, res, next) => {
      const url = req.originalUrl;
      const accept = req.headers.accept || '';
      if (accept.includes('text/html') && !url.startsWith('/api') && !url.startsWith('/@') && !url.includes('.')) {
        try {
          const indexPath = path.join(process.cwd(), 'index.html');
          let template = await fs.promises.readFile(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          return;
        } catch (e) {
          return next(e);
        }
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    // APP_DIST_PATH is set by Electron before requiring this bundle.
    // Falls back to process.cwd()/dist for normal tsx production runs.
    const distPath = process.env.APP_DIST_PATH || path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get(/^\/(?!api).*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, CONFIG.server.host, () => {
    const addr = httpServer.address();
    if (addr && typeof addr === "object") boundPort = addr.port;
    logger.info(`Server running on http://localhost:${boundPort}`);
    startClassBeacon(boundPort);
  });
}

startServer();
