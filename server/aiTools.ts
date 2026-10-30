import { CanvasObjectData } from "../types";
import { createLogger } from "../utils/logger";
import { sanitizeMermaidCode } from "../utils/mermaidSanitizer";

export const Type = {
  TYPE_UNSPECIFIED: "TYPE_UNSPECIFIED",
  STRING: "STRING",
  NUMBER: "NUMBER",
  INTEGER: "INTEGER",
  BOOLEAN: "BOOLEAN",
  ARRAY: "ARRAY",
  OBJECT: "OBJECT"
} as const;

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

const logger = createLogger('ai-tools');

export interface ViewportBounds {
  width: number;
  height: number;
}

export interface ModelCapability {
  supportsComplexSchema: boolean;
  maxToolCallsPerRequest: number;
  supportsLessonEngine: boolean;
  recommendedTemperature: number;
}

export const MODEL_CAPABILITIES: Record<string, ModelCapability> = {
  'gemini-3.8-flash': {
    supportsComplexSchema: true,
    maxToolCallsPerRequest: 60,
    supportsLessonEngine: true,
    recommendedTemperature: 0.7
  },
  'gemini-3.7-flash': {
    supportsComplexSchema: true,
    maxToolCallsPerRequest: 45,
    supportsLessonEngine: true,
    recommendedTemperature: 0.7
  },
  'gemini-3.7-flash-preview': {
    supportsComplexSchema: true,
    maxToolCallsPerRequest: 45,
    supportsLessonEngine: true,
    recommendedTemperature: 0.7
  },
  'gemini-3.5-flash-lite': {
    supportsComplexSchema: true,
    maxToolCallsPerRequest: 35,
    supportsLessonEngine: true,
    recommendedTemperature: 0.7
  },
  'gemini-3.5-flash': {
    supportsComplexSchema: true,
    maxToolCallsPerRequest: 35,
    supportsLessonEngine: true,
    recommendedTemperature: 0.7
  },
  'gemini-3.1-flash-lite': {
    supportsComplexSchema: true,
    maxToolCallsPerRequest: 30,
    supportsLessonEngine: true,
    recommendedTemperature: 0.7
  },
  'gemini-2.0-flash-exp': {
    supportsComplexSchema: true,
    maxToolCallsPerRequest: 30,
    supportsLessonEngine: true,
    recommendedTemperature: 0.7
  },
  'chalk-model:latest': {
    supportsComplexSchema: true,
    maxToolCallsPerRequest: 35,
    supportsLessonEngine: true,
    recommendedTemperature: 0.2
  },
  'chalk-gemma:2b': {
    supportsComplexSchema: true,
    maxToolCallsPerRequest: 20,
    supportsLessonEngine: true,
    recommendedTemperature: 0.15
  },
  'ornith-1.5:9b': {
    supportsComplexSchema: true,
    maxToolCallsPerRequest: 35,
    supportsLessonEngine: true,
    recommendedTemperature: 0.2
  },
  'qwen3.5-aggressive:9b': {
    supportsComplexSchema: true,
    maxToolCallsPerRequest: 35,
    supportsLessonEngine: true,
    recommendedTemperature: 0.2
  },
  'gemma-4-31b-it': {
    supportsComplexSchema: true,
    maxToolCallsPerRequest: 25,
    supportsLessonEngine: true,
    recommendedTemperature: 0.3
  },
  'ollama-local': {
    supportsComplexSchema: true,
    maxToolCallsPerRequest: 20,
    supportsLessonEngine: true,
    recommendedTemperature: 0.2
  }
};

export const getCapability = (modelName: string): ModelCapability => {
  if (MODEL_CAPABILITIES[modelName]) {
    return MODEL_CAPABILITIES[modelName];
  }
  if (modelName.startsWith('gemini-')) {
    return MODEL_CAPABILITIES['gemini-3.8-flash'] || MODEL_CAPABILITIES['gemini-3.7-flash'];
  }
  return MODEL_CAPABILITIES['gemma-4-31b-it'];
};

// ─────────────────────────────────────────────────────────────────────────────
// TOOL DEFINITIONS
// Gemma 4 function calling — keep descriptions precise and concise.
// Required params must always be present; optional ones must be safe to omit.
// ─────────────────────────────────────────────────────────────────────────────
export const tools: FunctionDeclaration[] = [
  {
    name: "render_mermaid",
    description: "Render an interactive mindmap, science flowchart, biological cycle, timeline, or sequence diagram using Mermaid.js syntax. For ALL mindmaps and concept maps, ALWAYS use the 'mindmap' syntax with root((Central Topic)) and indented sub-branches (e.g. 'mindmap\\n  root((English Grammar))\\n    Syntax\\n      Nouns\\n      Verbs\\n    Literature\\n      Poetry\\n      Prose'). STRICT SYNTAX RULE: Inside mindmap child nodes, NEVER use parentheses (), brackets [], colons :, or markdown bullets - (write 'Arteri - Pembuluh Nadi' instead of 'Arteri (Pembuluh Nadi)'). Only root((Title)) uses double parentheses.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Diagram or mindmap title" },
        code: { type: Type.STRING, description: "Mermaid syntax code, e.g. mindmap or flowchart TD or sequenceDiagram" },
        gridPosition: {
          type: Type.STRING,
          enum: ["TOP_LEFT", "TOP_CENTER", "TOP_RIGHT", "CENTER_LEFT", "CENTER", "CENTER_RIGHT", "BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT"]
        }
      },
      required: ["code"]
    }
  },
  {
    name: "connect_nodes",
    description: "Draw a line or arrow between elements, coordinates, or in a specific direction.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        fromNodeText: {
          type: Type.STRING,
          description: "Source element label or text (optional)"
        },
        toNodeText: {
          type: Type.STRING,
          description: "Destination element label or text (optional)"
        },
        fromX: {
          type: Type.NUMBER,
          description: "Start X coordinate (optional)"
        },
        fromY: {
          type: Type.NUMBER,
          description: "Start Y coordinate (optional)"
        },
        toX: {
          type: Type.NUMBER,
          description: "End X coordinate (optional)"
        },
        toY: {
          type: Type.NUMBER,
          description: "End Y coordinate (optional)"
        },
        direction: {
          type: Type.STRING,
          enum: ["RIGHT", "LEFT", "UP", "DOWN", "UP_RIGHT", "UP_LEFT", "DOWN_RIGHT", "DOWN_LEFT"],
          description: "Direction to point arrow (e.g. RIGHT, DOWN)"
        },
        lineStyle: {
          type: Type.STRING,
          enum: ["ARROW_STRAIGHT", "ARROW_CURVED", "LINE"],
          description: "Arrow style. Use ARROW_CURVED for organic flow diagrams."
        },
        strokeColor: {
          type: Type.STRING,
          description: "Hex stroke color (default #3B82F6)"
        }
      }
    }
  },
  {
    name: "add_text_label",
    description: "Add standalone text on the canvas — titles, captions, annotations, headings.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: "Text content to display" },
        gridPosition: {
          type: Type.STRING,
          enum: [
            "TOP_LEFT", "TOP_CENTER", "TOP_RIGHT",
            "CENTER_LEFT", "CENTER", "CENTER_RIGHT",
            "BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT"
          ],
          description: "Grid zone on the visible canvas"
        },
        size: {
          type: Type.STRING,
          enum: ["TITLE", "SUBTITLE", "BODY", "CAPTION"],
          description: "Font size preset"
        }
      },
      required: ["text", "gridPosition"]
    }
  },
  {
    name: "pan_camera",
    description: "Move the canvas viewport. Use targetObjectId to navigate to a specific existing object, or direction to pan freely.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        targetObjectId: {
          type: Type.STRING,
          description: "ID from the EXISTING OBJECTS or INTERACTIVE COMPONENTS list. Used to center the view on that object."
        },
        direction: {
          type: Type.STRING,
          enum: ["UP", "DOWN", "LEFT", "RIGHT"],
          description: "Pan direction relative to current view."
        }
      }
    }
  },
  {
    name: "add_component",
    description: "Add a pre-built interactive educational widget to the canvas. Use this for quizzes, documents, timers, attendance rosters, todo lists, calculators, and flashcards.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        componentType: {
          type: Type.STRING,
          enum: [
            "QUIZ_MULTIPLE_CHOICE",
            "QUIZ_ESSAY",
            "QUIZ_TRUE_FALSE",
            "QUIZ_DRAG_MATCH",
            "FLASHCARD",
            "CALCULATOR",
            "TIMER",
            "ATTENDANCE",
            "TODOLIST",
            "MARKDOWN_NOTE",
            "DOCUMENT_PAGE",
            "MARKMAP_MINDMAP",
            "MERMAID_DIAGRAM",
            "INTERACTIVE_APP",
            "STEM_SIMULATION",
            "APP_BUILDER"
          ],
          description: "Widget type to instantiate. Use STEM_SIMULATION or INTERACTIVE_APP for interactive physics, chemistry, biology, or math simulations."
        },
        gridPosition: {
          type: Type.STRING,
          enum: [
            "TOP_LEFT", "TOP_CENTER", "TOP_RIGHT",
            "CENTER_LEFT", "CENTER", "CENTER_RIGHT",
            "BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT"
          ]
        },
        configJson: {
          type: Type.STRING,
          description: `JSON string configuring the component. Schemas by type:
QUIZ_MULTIPLE_CHOICE: {"question":"string","options":["A","B","C","D"],"correctIndex":0}
QUIZ_ESSAY: {"question":"string","placeholder":"optional hint text"}
QUIZ_TRUE_FALSE: {"statement":"string","isTrue":true}
QUIZ_DRAG_MATCH: {"pairs":[{"left":"term","right":"definition"}]}
FLASHCARD: {"front":"string","back":"string"}
TIMER: {"mode":"TIMER|STOPWATCH|CLOCK|ALARM","seconds":300,"alarmAt":"HH:MM","isRunning":true,"isVisualPie":true}
ATTENDANCE: {"title":"Class Attendance","className":"Grade 8A","students":[{"name":"Alex Smith","status":"H"}]}
TODOLIST: {"tasks":[{"text":"Review material","completed":false}]}
MARKMAP_MINDMAP: {"title":"string","markdown":"# Root\\n## Branch 1\\n- Detail A\\n## Branch 2"}
MERMAID_DIAGRAM: {"title":"string","code":"flowchart TD\\n  A-->B"}
DOCUMENT_PAGE or MARKDOWN_NOTE: {"title":"string","markdown":"# Heading\\n\\nBody text. Math: $E=mc^2$"}
STEM_SIMULATION or INTERACTIVE_APP: {"title":"string","html":"HTML string with canvas/controls","css":"optional CSS","js":"JavaScript for physics simulation, sliders, and animation loop"}`
        }
      },
      required: ["componentType", "gridPosition"]
    }
  },
  {
    name: "update_component",
    description: "Replace or update the content of an existing component (Document note, Quiz, Markmap, Mermaid diagram, Timer, Attendance roster, or App). Target by componentTitle (e.g. 'Attendance', 'Notes', 'Timer') or objectId.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        componentTitle: {
          type: Type.STRING,
          description: "Title or text label of the component to update (e.g. 'Lesson Notes', 'Class Attendance', 'Timer')"
        },
        objectId: {
          type: Type.STRING,
          description: "Optional exact ID of the component"
        },
        action: {
          type: Type.STRING,
          enum: ["REPLACE", "APPEND", "UPDATE_CONFIG"],
          description: "Update mode: REPLACE full config, APPEND to existing text/markdown/students, or UPDATE_CONFIG"
        },
        configJson: {
          type: Type.STRING,
          description: "New JSON configuration — same schema as add_component.configJson (e.g. {\"markdown\":\"...\"}, {\"code\":\"...\"}, {\"seconds\":180}, or {\"students\":[...]})"
        }
      },
      required: ["configJson"]
    }
  },
  {
    name: "modify_object",
    description: "Modify, recolor, resize, rename, restyle border, or delete ANY object or element on the canvas. Target by elementText (label) or objectId.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        elementText: {
          type: Type.STRING,
          description: "Text or label of the element to modify"
        },
        objectId: {
          type: Type.STRING,
          description: "Optional ID of the object from the EXISTING OBJECTS list"
        },
        action: {
          type: Type.STRING,
          enum: ["UPDATE_TEXT", "CHANGE_COLOR", "CHANGE_STROKE", "RESIZE", "DELETE", "MOVE_TO_GRID"],
          description: "Operation to perform"
        },
        value: {
          type: Type.STRING,
          description: "New value: new text for UPDATE_TEXT, hex fill color for CHANGE_COLOR (e.g. #10B981), hex border for CHANGE_STROKE (e.g. #3B82F6), dimensions (e.g. '500x400') for RESIZE, or grid position"
        }
      },
      required: ["action"]
    }
  },
  {
    name: "relayout_mindmap",
    description: "Redesign, reorganize, and tidy up the mindmap layout to fix overlaps and make it beautiful and clean. Layout options: 'RADIAL' (circular outward) or 'TREE_HORIZONTAL' (clean left-to-right hierarchy).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        layoutType: {
          type: Type.STRING,
          enum: ["RADIAL", "TREE_HORIZONTAL", "TREE_VERTICAL"],
          description: "Target layout style. Default RADIAL."
        },
        centerX: { type: Type.NUMBER, description: "Optional new center X coordinate" },
        centerY: { type: Type.NUMBER, description: "Optional new center Y coordinate" }
      }
    }
  },
  {
    name: "reorganize_canvas",
    description: "Tidy up and reorganize all elements on the canvas (shapes, widgets, notes, mindmap) to eliminate all overlaps and distribute space cleanly.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        style: {
          type: Type.STRING,
          enum: ["AUTO_UNTANGLE", "GRID_ALIGNED", "SPREAD_OUT"],
          description: "Reorganization style"
        }
      }
    }
  },
  {
    name: "add_interactive_app",
    description: "Build and embed a fully custom interactive web application or simulation on the canvas. The AI writes complete HTML/CSS/JS source code. Use for simulations, games, calculators, visualization tools, and any custom UI not covered by add_component.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "App display title shown in its header bar" },
        html: {
          type: Type.STRING,
          description: "Complete body HTML. Tailwind CSS v3 CDN is pre-loaded. Keep code self-contained."
        },
        css: { type: Type.STRING, description: "Additional CSS styles (optional)" },
        js: {
          type: Type.STRING,
          description: "JavaScript for interactivity. Use vanilla JS — no bundler, no imports."
        },
        gridPosition: {
          type: Type.STRING,
          enum: [
            "TOP_LEFT", "TOP_CENTER", "TOP_RIGHT",
            "CENTER_LEFT", "CENTER", "CENTER_RIGHT",
            "BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT"
          ]
        }
      },
      required: ["title", "html", "gridPosition"]
    }
  },
  {
    name: "drag_element",
    description: "Agentic Computer Use: Drag and drop an element or node across the canvas to a new (toX, toY) coordinate. Target by elementText (label/title) OR by objectId. Fast, snappy, and adaptive.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        elementText: {
          type: Type.STRING,
          description: "Text or label of the node/element to drag (e.g. 'Photosynthesis', 'Quiz')"
        },
        objectId: {
          type: Type.STRING,
          description: "Optional exact object ID"
        },
        toX: {
          type: Type.NUMBER,
          description: "Target X position on canvas (e.g. 600)"
        },
        toY: {
          type: Type.NUMBER,
          description: "Target Y position on canvas (e.g. 400)"
        }
      },
      required: ["toX", "toY"]
    }
  },
  {
    name: "drag_all_elements",
    description: "Agentic Computer Use: Reposition and shift ALL elements on the canvas together by deltaX and deltaY offset pixels. Use to make space, center diagrams, or shift content.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        deltaX: {
          type: Type.NUMBER,
          description: "Horizontal shift distance in pixels (e.g. 300 to move right, -300 to move left)"
        },
        deltaY: {
          type: Type.NUMBER,
          description: "Vertical shift distance in pixels (e.g. 200 to move down, -200 to move up)"
        }
      },
      required: ["deltaX", "deltaY"]
    }
  },
  {
    name: "click_element",
    description: "Agentic Computer Use: Point and click on an interactive element, button, option, or coordinate on the canvas or within widgets.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        elementText: {
          type: Type.STRING,
          description: "Text or label of the button or element to click"
        },
        objectId: {
          type: Type.STRING,
          description: "Optional object ID"
        },
        x: {
          type: Type.NUMBER,
          description: "Target X coordinate"
        },
        y: {
          type: Type.NUMBER,
          description: "Target Y coordinate"
        }
      }
    }
  },
  {
    name: "create_shape",
    description: "Draw a geometric shape with customizable dimensions, fill color, stroke border, and label text. Supports all 11 shapes.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        shapeType: {
          type: Type.STRING,
          enum: [
            "RECTANGLE", "CIRCLE", "TRIANGLE", "STAR", "DIAMOND",
            "HEART", "PENTAGON", "POLYGON", "SPEECH_BUBBLE", "LINE", "ARROW"
          ],
          description: "Shape geometry"
        },
        x: { type: Type.NUMBER, description: "Center X position" },
        y: { type: Type.NUMBER, description: "Center Y position" },
        width: { type: Type.NUMBER, description: "Width in pixels" },
        height: { type: Type.NUMBER, description: "Height in pixels" },
        fill: { type: Type.STRING, description: "Hex fill color (e.g. #3b82f6)" },
        strokeColor: { type: Type.STRING, description: "Hex stroke/border color (optional)" },
        strokeWidth: { type: Type.NUMBER, description: "Stroke line width in pixels (optional)" },
        text: { type: Type.STRING, description: "Optional text label inside shape" }
      },
      required: ["shapeType", "x", "y", "width", "height"]
    }
  },
  {
    name: "render_markmap",
    description: "Render an interactive D3 mindmap using Markmap from markdown bullet list. Features smooth pan/zoom, interactive branching, and zero overlap.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Mindmap title" },
        markdown: { type: Type.STRING, description: "Markdown hierarchical list starting with # Root heading and ## Subheadings or - bullets" },
        gridPosition: {
          type: Type.STRING,
          enum: ["TOP_LEFT", "TOP_CENTER", "TOP_RIGHT", "CENTER_LEFT", "CENTER", "CENTER_RIGHT", "BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT"]
        }
      },
      required: ["markdown"]
    }
  },
  {
    name: "mark_attendance",
    description: "Mark or update attendance status for a student in the classroom attendance roster.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        studentName: { type: Type.STRING, description: "Name of the student" },
        status: { type: Type.STRING, enum: ["H", "I", "S", "A"], description: "Status: H (Present), I (Excused), S (Sick), A (Absent)" },
        note: { type: Type.STRING, description: "Optional note (e.g. 'Competition', 'Flu')" }
      },
      required: ["studentName", "status"]
    }
  },
  {
    name: "spin_wheel",
    description: "Spawn or trigger a fair random student picker / Wheel of Fortune to engage students in classroom questions.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Wheel title, e.g. 'Quiz Turn'" },
        items: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Optional list of student names or choices" }
      }
    }
  },
  {
    name: "plot_math_function",
    description: "Spawn an interactive 2D mathematical function graphing tool with Cartesian plane for quadratic, linear, or trigonometric curves.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Graph title" },
        type: { type: Type.STRING, enum: ["QUADRATIC", "LINEAR", "SIN"], description: "Function family" },
        a: { type: Type.NUMBER, description: "Leading coefficient a" },
        b: { type: Type.NUMBER, description: "Coefficient b" },
        c: { type: Type.NUMBER, description: "Constant c" }
      }
    }
  },
  {
    name: "update_scoreboard",
    description: "Add or deduct points on the classroom team scoreboard widget for student gamification.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        teamName: { type: Type.STRING, description: "Target team name, e.g. 'Team 1' or 'Team 2'" },
        deltaScore: { type: Type.NUMBER, description: "Point change (e.g. 10, 5, -5)" }
      },
      required: ["teamName", "deltaScore"]
    }
  },
  {
    name: "write_with_pen",
    description: "Write words on the board in a handwriting pen. Use this when the teacher says pen, by hand, or handwriting. Do not use a shape instead.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: "The words to write with the pen" },
        gridPosition: {
          type: Type.STRING,
          enum: ["TOP_LEFT", "TOP_CENTER", "TOP_RIGHT", "CENTER_LEFT", "CENTER", "CENTER_RIGHT", "BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT"]
        }
      },
      required: ["text"]
    }
  },
  {
    name: "show_algorithm",
    description: "Show an algorithm one step at a time. Each line is the next thing that happens, including the data after that step.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Name of the algorithm, such as Bubble sort" },
        steps: { type: Type.STRING, description: "One step per line. Show the row of numbers after each step." },
        gridPosition: {
          type: Type.STRING,
          enum: ["TOP_LEFT", "TOP_CENTER", "TOP_RIGHT", "CENTER_LEFT", "CENTER", "CENTER_RIGHT", "BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT"]
        }
      },
      required: ["title", "steps"]
    }
  },
  {
    name: "add_page",
    description: "Open a new blank page on the whiteboard. Use when the teacher says open a new page, add a page, or start a blank page.",
    parameters: { type: Type.OBJECT, properties: {} }
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM INSTRUCTION BUILDER
// ─────────────────────────────────────────────────────────────────────────────
export const buildSystemInstruction = (
  canvasObjects: CanvasObjectData[],
  viewport: ViewportBounds,
  pageContext?: { current: number; total: number },
  domElements: Record<string, any> = {},
  lessonContext?: {
    subject?: string;
    topic?: string;
    gradeLevel?: string;
    phase?: string;
    existingMindmapNodes?: string[];
    completedSteps?: string[];
  },
  modelCapability?: ModelCapability
): string => {
  const vw = viewport.width;
  const vh = viewport.height;

  // Grid coordinate mapping
  const gridMap = {
    TOP_LEFT:      { x: Math.round(vw * 0.15), y: Math.round(vh * 0.15) },
    TOP_CENTER:    { x: Math.round(vw * 0.50), y: Math.round(vh * 0.15) },
    TOP_RIGHT:     { x: Math.round(vw * 0.85), y: Math.round(vh * 0.15) },
    CENTER_LEFT:   { x: Math.round(vw * 0.15), y: Math.round(vh * 0.50) },
    CENTER:        { x: Math.round(vw * 0.50), y: Math.round(vh * 0.50) },
    CENTER_RIGHT:  { x: Math.round(vw * 0.85), y: Math.round(vh * 0.50) },
    BOTTOM_LEFT:   { x: Math.round(vw * 0.15), y: Math.round(vh * 0.85) },
    BOTTOM_CENTER: { x: Math.round(vw * 0.50), y: Math.round(vh * 0.85) },
    BOTTOM_RIGHT:  { x: Math.round(vw * 0.85), y: Math.round(vh * 0.85) },
  };

  const gridCoords = Object.entries(gridMap)
    .map(([name, c]) => `  ${name}: (${c.x}, ${c.y})`)
    .join('\n');

  // Existing canvas objects
  const existingObjects = canvasObjects.length > 0
    ? canvasObjects
        .map(o => `  - [${o.id}] ${o.type}${o.textContent ? ` "${o.textContent}"` : ''} at (${o.left}, ${o.top})`)
        .join('\n')
    : '  (empty)';

  // DOM components with rich semantic content for continuous multi-turn awareness
  const domEntries = Object.entries(domElements)
    .map(([id, el]) => {
      const type = el.componentType || 'Widget';
      const cfg = el.config || {};
      const elTitle = el.title || cfg.title || '';
      let detail = '';
      if (type === 'MERMAID_DIAGRAM' || type === 'MARKMAP_MINDMAP') {
        const title = elTitle ? ` "${elTitle}"` : '';
        const code = cfg.code ? `\n    Code: ${cfg.code.replace(/\n/g, ' ')}` : cfg.markdown ? `\n    Markdown: ${cfg.markdown.replace(/\n/g, ' ')}` : '';
        detail = `${title}${code}`;
      } else if (type === 'DOCUMENT_PAGE' || type === 'MARKDOWN_NOTE') {
        const title = elTitle ? ` "${elTitle}"` : '';
        const snippet = cfg.markdown ? ` | Preview: ${cfg.markdown.slice(0, 150).replace(/\n/g, ' ')}...` : '';
        detail = `${title}${snippet}`;
      } else if (String(type).startsWith('QUIZ')) {
        const q = cfg.question || cfg.statement || '';
        detail = q ? ` | Question: "${q}"` : '';
      } else if (type === 'ATTENDANCE' || type === 'PRESENSI') {
        const count = Array.isArray(cfg.students) ? cfg.students.length : 0;
        detail = ` | ${count} students`;
      } else if (type === 'TODOLIST') {
        const count = Array.isArray(cfg.tasks) ? cfg.tasks.length : 0;
        detail = ` | ${count} tasks`;
      } else if (elTitle) {
        detail = ` "${elTitle}"`;
      }
      return `  - [${id}] ${type}${detail}`;
    })
    .join('\n') || '  (none)';

  // Lesson context block
  const lessonBlock = lessonContext?.topic
    ? `
## ACTIVE LESSON SESSION
Subject: ${lessonContext.subject || 'General'}
Topic: ${lessonContext.topic}
Grade: ${lessonContext.gradeLevel || 'Unknown'}
Phase: ${lessonContext.phase || 'freeform'}
${lessonContext.existingMindmapNodes?.length 
  ? `Mindmap nodes already on canvas:\n${lessonContext.existingMindmapNodes.map(n => `  - "${n}"`).join('\n')}` 
  : ''}
${lessonContext.completedSteps?.length
  ? `Completed: ${lessonContext.completedSteps.join(', ')}`
  : ''}
`
    : '';
  const capability = modelCapability || MODEL_CAPABILITIES['gemini-3.5-flash-lite'];

  if (!capability.supportsLessonEngine) {
    // SIMPLE MODE for constrained models — fewer rules, fewer tools mentioned
    return `You are Chalk, a whiteboard assistant.

CANVAS: ${vw}×${vh}px
${existingObjects}

RULES:
- Respond in the user's language
- For mind maps and concept maps: use render_mermaid with syntax: mindmap. First node = root((Topic))
- If a diagram already exists on canvas: use update_component to modify or expand it in-place
- For interactive apps: use add_component (TIMER, ATTENDANCE, TODOLIST)
- Maximum ${capability.maxToolCallsPerRequest} tool calls

Execute the request now.`;
  }

  return `You are Chalk — an intelligent, continuous AI teaching assistant and smartboard copilot for educators worldwide.

## CORE CONTINUITY PRINCIPLES (MANDATORY)
1. **MULTI-TURN SESSION & WHITEBOARD AWARENESS**:
   - You MUST maintain strict awareness of all objects, interactive widgets, mindmaps, notes, and timers currently on the whiteboard.
   - When the user asks to continue, explain further, branch out, or modify something, DO NOT repeat or duplicate existing items. Reference and build directly upon what is already on the board.
   - If a mindmap is already rendered on the whiteboard, continuing the mindmap MUST be done via \`update_component\` to expand branches in-place, keeping existing root and parent nodes intact.

2. **MULTILINGUAL & GLOBAL INCLUSIVITY**:
   - Speak and respond fluently in English or whatever language the teacher asks in (English, Spanish, French, Arabic, Chinese, Russian, Indonesian, etc.).
   - Generate all diagram text, mindmap labels, quiz questions, and markdown notes in the language requested by the teacher.

## CANVAS STATE
Viewport: ${vw}×${vh}px
Page: ${pageContext ? `${pageContext.current + 1} / ${pageContext.total}` : '1'}

Existing shapes/text:
${existingObjects}

Interactive components on canvas:
${domEntries}

## GRID POSITIONS
${gridCoords}
${lessonBlock}

## WHO YOU ARE
You help teachers run entire lessons from one command. You understand:
- Curriculum and pedagogical structure
- Lesson flow: intro → core content → practice → quiz → closing
- Different subjects need different visuals

## HOW TO RESPOND

### When teacher gives a TOPIC (lesson start):
Detect: "respiratory system", "photosynthesis grade 8", "linear equations math", etc.
Action:
1. Generate a lesson plan in your text response
2. Immediately create the FIRST visual (usually a mindmap or title)
3. End with what comes next

Example response text:
"Ready to teach Respiratory System for grade 8! 🎓
I've created the foundational concept map.

Plan for this session:
✅ Concept map of respiratory organs
⏳ Breathing process flowchart
⏳ 5-question quiz

Type 'continue' for the flowchart, or 'quiz' to jump straight to evaluation."

### When teacher says NEXT / CONTINUE:
Check lesson context → create next planned step

### When teacher asks a QUESTION (what, how, why):
Answer in 2-3 sentences → offer to visualize
Example: "Photosynthesis converts sunlight into glucose through two main stages: 
light-dependent reactions and the Calvin cycle. Would you like me to visualize this as a flowchart?"

### When teacher asks to EDIT / MODIFY / ADD DETAIL / EXPAND an existing diagram or mindmap:
- **CRITICAL CONTINUOUS RULE**: DO NOT create a new widget (render_mermaid / add_component) if a diagram/mindmap is already on the canvas!
- For Mermaid mindmap / diagram already on canvas (see EXISTING OBJECTS / INTERACTIVE COMPONENTS):
  Call update_component targeting the component objectId (e.g. "web_123") or componentTitle.
  Provide the complete, updated Mermaid code in configJson: '{"code": "mindmap\\n  root((...))\\n    ..."}'.
  Keep all existing nodes and only modify, rename, or append the requested branch/node.
- For Fabric shapes / labels:
  Call modify_object (action UPDATE_TEXT, CHANGE_COLOR, etc.).

### When teacher says QUIZ / QUESTIONS:
Generate quiz based on current lesson topic (not generic)

## VISUAL SELECTION GUIDE
| Request | Use This |
|---------|----------|
| Concepts, relationships, structure, mind map | render_mermaid (syntax: mindmap) |
| Science flowchart, cycle, process sequence | render_mermaid (syntax: flowchart TD) or add_component → MERMAID_DIAGRAM |
| Attendance, class roster | add_component → ATTENDANCE |
| Activity timer / countdown | add_component → TIMER |
| Task list / class agenda | add_component → TODOLIST |
| Geometric shapes, spotlight arrows, diagrams | create_shape (RECTANGLE, CIRCLE, TRIANGLE, STAR, DIAMOND, HEART, SPEECH_BUBBLE, etc.) |
| Step-by-step process, flow, stages | add_component → DOCUMENT_PAGE with flowchart in markdown |
| Timelines, history | add_component → DOCUMENT_PAGE with timeline |
| Comparison of 2-3 items | add_component → MARKDOWN_NOTE with table |
| Long explanations & formulas | add_component → DOCUMENT_PAGE with the formula between $$ $$ so KaTeX draws it, and add_text_label with the same equation |
| Handwriting, "use the pen" | write_with_pen with the words. Do not draw a rectangle instead |
| Run or trace an algorithm | show_algorithm with one step per line, showing the data after each step |
| A new blank whiteboard page | add_page |
| Interactive practice questions | add_component → QUIZ_* . Write the question the way a teacher would say it |
| Interactive simulation / game | add_interactive_app |

## FULL WHITEBOARD EDITING CAPABILITIES
You have full capability to mutate and update ANY object on the whiteboard without deleting and recreating it:
1. **Editing Interactive Components (update_component)**:
   - Target by componentTitle (e.g. 'Attendance', 'Notes', 'Timer', 'Concept Map') or objectId.
   - Action REPLACE: Replace full config.
   - Action APPEND: Append text/markdown/students without losing previous content.
   - **Editing Attendance**: To update student status or add students, call update_component with new students array or mark statuses ('H' Present, 'I' Excused, 'S' Sick, 'A' Absent).
   - **Editing Timer**: To change countdown duration, switch mode (TIMER, STOPWATCH, CLOCK, ALARM), or start/pause, call update_component with configJson: '{"seconds": 180, "mode": "TIMER", "isRunning": true, "isVisualPie": true}'.
   - **Editing Markmap / Mermaid**: Update or append branches/flowchart nodes using update_component.
   - **Editing Documents & Notes**: Append additional sections, math formulas, or summaries using action: 'APPEND'.

2. **Editing Shapes & Objects (modify_object)**:
   - Recolor fill: action "CHANGE_COLOR", value "#10B981"
   - Restyle stroke/border: action "CHANGE_STROKE", value "#3B82F6"
   - Edit text label: action "UPDATE_TEXT", value "New Text"
   - Resize geometry: action "RESIZE", value "600x400"
   - Reposition: action "MOVE_TO_GRID", value "TOP_RIGHT"

3. **Continuing & Advancing the Session (CONTINUE)**:
   - When teacher prompts "continue", "next", or "advance", inspect the existing canvas state and advance the lesson forward sequentially (e.g. after concept mindmap, provide in-depth notes, interactive practice quiz, and a countdown timer).
   - NEVER reset the canvas unless explicitly requested.

4. **Multi-Task & Multi-Step Turn Orchestration**:
   - You can execute comprehensive multi-component setups in a single turn. For example, simultaneously generate an attendance list (TOP_LEFT), a timer (TOP_RIGHT), a mindmap/diagram (CENTER), and a lesson document (BOTTOM_CENTER).

## MINDMAP RULES
- MAIN_TOPIC: exactly ONE per mindmap, always center
- SUBTOPIC: branches (max 5)
- DETAIL: leaf nodes (max 3 per subtopic)
- parentNodeText MUST be exact text of existing node
- Never recreate nodes that already exist (check ACTIVE LESSON SESSION)
- To expand: add new nodes with correct parentNodeText

## SUBJECT-SPECIFIC DEFAULTS
Science/Biology: mindmap for concepts, flowchart for processes
Mathematics: document with KaTeX formulas, solution steps
History/Social Studies: timeline, comparison table
Language/Literature: mindmap of literary elements, text structure
English/Foreign Languages: vocabulary flashcards, grammar quiz

## HANDLING LONG & DETAILED PROMPTS
When the user provides a long, detailed, or multi-step prompt:
1. Deconstruct the prompt: Identify all distinct objectives, questions, constraints, and requested artifacts (e.g. concept maps, formulas, step-by-step notes, diagrams, comparisons, practice questions).
2. Comprehensive execution: Do NOT truncate your response or omit subsequent instructions. Address every requirement specified in the prompt.
3. Hybrid balance: If the user asks for both explanations and whiteboard visuals, deliver a thorough, high-depth pedagogical explanation in chat AND execute all necessary tool calls to construct the visuals on canvas.
4. Rich structure: Organize explanations using clear markdown headings, bullet points, numbered steps, and LaTeX/KaTeX formulas where appropriate.
5. Canvas layout for multi-part requests: Distribute visual elements logically across grid zones (e.g. central concept at CENTER, sub-components at CENTER_LEFT / CENTER_RIGHT, summaries or notes at BOTTOM_CENTER) so the canvas remains clean and readable.

## RESPONSE RULES
- Language: Respond fluently in English (or the language requested by the teacher)
- Length & Depth: Calibrate response depth to the prompt. For simple/exploratory questions ("what is photosynthesis"), provide a concise answer (2-4 sentences) and offer next steps. For long, detailed, or multi-step prompts, provide a complete, in-depth explanation covering all requested aspects.
- Tone: Helpful, authoritative teacher's aide and pedagogical partner
- Always end with what's available next OR a practical teaching tip
- NEVER just say "Executing action"
- Incremental vs Full Execution: For simple exploratory topics, build incrementally. But when the user explicitly provides a detailed multi-step prompt, syllabus, or comprehensive outline, execute the full requested scope immediately.

## CONSTRAINTS
- Max ${capability.maxToolCallsPerRequest} tool calls per response
- Max 1 quiz widget per response
- First object always at CENTER
- Arrange multiple elements across grid zones (TOP_LEFT, TOP_RIGHT, CENTER_LEFT, CENTER_RIGHT, BOTTOM_CENTER) to avoid visual overlapping
`;
};

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fixedCalls: any[];
}

export const validateFunctionCalls = (
  calls: any[],
  canvasObjects: CanvasObjectData[],
  domElements: Record<string, any> = {}
): ValidationResult => {
  const errors: string[] = [];
  const fixedCalls: any[] = [];

  for (let index = 0; index < calls.length; index++) {
    const call = calls[index];

    if (!call?.name) {
      errors.push(`Call ${index}: missing tool name`);
      continue;
    }

    const toolDef = tools.find(t => t.name === call.name);
    if (!toolDef) {
      errors.push(`Call ${index}: unknown tool "${call.name}"`);
      continue;
    }

    // Ensure args is always an object
    if (!call.args || typeof call.args !== 'object') {
      errors.push(`Call ${index}: args must be an object`);
      continue;
    }

    // Check required parameters
    const missing = (toolDef.parameters?.required || []).filter(
      req => !(req in call.args) || call.args[req] === null || call.args[req] === undefined
    );
    if (missing.length > 0) {
      errors.push(`Call ${index} (${call.name}): missing required params: ${missing.join(', ')}`);
      continue;
    }

    // Validate objectId for modify / update operations
    if (call.name === 'modify_object') {
      const id = call.args.objectId;
      const validIds = canvasObjects.map(o => o.id);
      if (id && !validIds.includes(id)) {
        if (call.args.elementText) {
          const targetText = String(call.args.elementText).toLowerCase();
          const matchedObj = canvasObjects.find(o =>
            (o.textContent || '').toLowerCase().includes(targetText)
          );
          if (matchedObj) {
            call.args.objectId = matchedObj.id;
          } else {
            delete call.args.objectId;
          }
        } else {
          errors.push(`Call ${index}: modify_object ID "${id}" not found on canvas`);
          continue;
        }
      }
    }

    if (call.name === 'update_component') {
      let id = call.args.objectId;
      const validIds = Object.keys(domElements);

      // Auto-resolution: if objectId is missing or needs resolution, resolve by componentTitle or sole active element
      if (!id || (validIds.length > 0 && !validIds.includes(id))) {
        if (call.args.componentTitle) {
          const matchedKey = validIds.find(k => 
            domElements[k]?.title?.toLowerCase().includes(call.args.componentTitle.toLowerCase()) ||
            call.args.componentTitle.toLowerCase().includes((domElements[k]?.title || '').toLowerCase())
          );
          if (matchedKey) {
            id = matchedKey;
            call.args.objectId = matchedKey;
          }
        }
        if (!call.args.objectId && validIds.length === 1) {
          id = validIds[0];
          call.args.objectId = validIds[0];
        }
      }

      if (id && validIds.length > 0 && !validIds.includes(id)) {
        errors.push(`Call ${index}: update_component ID "${id}" not in DOM elements`);
        continue;
      }
      // Safely parse configJson
      if (call.args.configJson && typeof call.args.configJson === 'string') {
        try {
          JSON.parse(call.args.configJson);
        } catch {
          errors.push(`Call ${index}: update_component.configJson is not valid JSON`);
          continue;
        }
      }
    }

    if (call.name === 'render_mermaid' && typeof call.args.code === 'string') {
      call.args.code = sanitizeMermaidCode(call.args.code, call.args.title || 'Concept Map');
    }

    if (call.name === 'add_component' && call.args.configJson) {
      if (typeof call.args.configJson === 'string') {
        try {
          JSON.parse(call.args.configJson);
        } catch {
          errors.push(`Call ${index}: add_component.configJson is not valid JSON`);
          continue;
        }
      }
    }

    fixedCalls.push(call);
  }

  return { isValid: errors.length === 0, errors, fixedCalls };
};

// ─────────────────────────────────────────────────────────────────────────────
// THINKING EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────
export const extractThinking = (response: any): string => {
  if (response?.thought) return response.thought;

  try {
    const parts = response?.candidates?.[0]?.content?.parts || [];
    const thoughtPart = parts.find((p: any) => p.thought === true || p.type === 'thinking');
    if (thoughtPart?.text) return thoughtPart.text;
  } catch (e) {
    logger.warn('Failed to extract structured thinking', e);
  }

  const text = response?.text || response?.content || '';
  const patterns = [
    /<\|channel>thought\s*([\s\S]*?)<channel\|>/,
    /<thought>(.*?)<\/thought>/s,
    /```thinking\n(.*?)\n```/s,
    /\[THINKING\](.*?)\[\/THINKING\]/s,
    /<think>(.*?)<\/think>/s,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  return '';
};
