// Paste into browser console, or import once in App.tsx to expose to window
import { useStore } from '../store';

export const attachDebugTools = () => {
  (window as any).Chalk = {
    // Inspect lesson state
    lesson: () => {
      const state = useStore.getState();
      console.table({
        subject: state.lessonPlan?.subject,
        topic: state.lessonPlan?.topic,
        gradeLevel: state.lessonPlan?.gradeLevel,
        phase: state.lessonPlan?.phase,
        completedSteps: state.lessonPlan?.completedSteps?.length || 0
      });
      return state.lessonPlan;
    },

    // Inspect registered mindmap nodes
    mindmap: () => {
      const nodes = useStore.getState().activeMindmapNodes;
      console.table(nodes.map(n => ({
        text: n.text,
        style: n.style,
        parent: n.parentNodeText || '(root)',
        x: Math.round(n.x),
        y: Math.round(n.y)
      })));
      return nodes;
    },

    // Inspect chat history
    chat: () => {
      const messages = useStore.getState().messages;
      messages.forEach((m, i) => {
        console.log(`${i}. [${m.role}]: ${m.text}`);
      });
      return messages;
    },

    // Inspect action queue
    queue: () => {
      const queue = useStore.getState().actionQueue;
      console.table(queue.map(a => ({ type: a.type, status: a.status })));
      return queue;
    },

    // Reset all for a new test
    reset: () => {
      useStore.getState().clearLesson();
      useStore.getState().clearQueue();
      useStore.setState({ messages: [{ role: 'model', text: 'Hello! New whiteboard is ready.' }] });
      console.log(' State reset for new test');
    },

    // Full state dump
    dump: () => {
      const s = useStore.getState();
      console.log({
        lesson: s.lessonPlan,
        mindmapNodes: s.activeMindmapNodes.length,
        messages: s.messages.length,
        queueLength: s.actionQueue.length,
        canvasObjectCount: 'check canvasRef.current.getObjects().length manually'
      });
    }
  };
  
  console.log(' Debug tools ready. Use: Chalk.lesson(), Chalk.mindmap(), Chalk.chat(), Chalk.queue(), Chalk.reset(), Chalk.dump()');
};
