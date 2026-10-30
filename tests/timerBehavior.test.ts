import { describe, it, expect } from 'vitest';
import { evaluateJevSystemOne } from '../hooks/useGeminiBrain';

describe('Timer behavior and single-instance management', () => {
  it('creates exactly one timer on the whiteboard when requested', () => {
    const domElements: Record<string, any> = {};
    const mockStore: any = {
      domElements,
      updateDomElement: (id: string, el: any) => {
        domElements[id] = el;
      },
    };

    const res = evaluateJevSystemOne('create a timer for 5 minutes', mockStore, null);
    expect(res.handled).toBe(true);
    expect(res.actionTaken).toBe('TOGGLE_TIMER');

    const timers = Object.values(domElements).filter(el => el.componentType === 'TIMER');
    expect(timers.length).toBe(1);
    expect(timers[0].config.seconds).toBe(300);
    expect(timers[0].config.isRunning).toBe(true);
  });

  it('updates the existing timer instead of duplicating when asking for "a" timer again', () => {
    const domElements: Record<string, any> = {
      timer_1: {
        id: 'timer_1',
        componentType: 'TIMER',
        config: { seconds: 300, isRunning: true },
        x: 100,
        y: 100,
        width: 340,
        height: 460
      }
    };
    const mockStore: any = {
      domElements,
      updateDomElement: (id: string, el: any) => {
        domElements[id] = el;
      },
    };

    const res = evaluateJevSystemOne('set a timer for 10 minutes', mockStore, null);
    expect(res.handled).toBe(true);
    expect(res.actionTaken).toBe('TOGGLE_TIMER');

    const timers = Object.values(domElements).filter(el => el.componentType === 'TIMER');
    expect(timers.length).toBe(1);
    expect(timers[0].config.seconds).toBe(600);
  });

  it('starts/runs the created timer via prompt', () => {
    const domElements: Record<string, any> = {
      timer_1: {
        id: 'timer_1',
        componentType: 'TIMER',
        config: { seconds: 300, isActive: false, isRunning: false },
        x: 100,
        y: 100,
        width: 340,
        height: 460
      }
    };
    const mockStore: any = {
      domElements,
      updateDomElement: (id: string, el: any) => {
        domElements[id] = el;
      },
    };

    const res = evaluateJevSystemOne('run the timer', mockStore, null);
    expect(res.handled).toBe(true);
    expect(res.actionTaken).toBe('START_TIMER');

    const timers = Object.values(domElements).filter(el => el.componentType === 'TIMER');
    expect(timers.length).toBe(1);
    expect(timers[0].config.isActive).toBe(true);
    expect(timers[0].config.isRunning).toBe(true);
  });

  it('pauses the timer via prompt', () => {
    const domElements: Record<string, any> = {
      timer_1: {
        id: 'timer_1',
        componentType: 'TIMER',
        config: { seconds: 300, isActive: true, isRunning: true },
        x: 100,
        y: 100,
        width: 340,
        height: 460
      }
    };
    const mockStore: any = {
      domElements,
      updateDomElement: (id: string, el: any) => {
        domElements[id] = el;
      },
    };

    const res = evaluateJevSystemOne('pause the timer', mockStore, null);
    expect(res.handled).toBe(true);
    expect(res.actionTaken).toBe('PAUSE_TIMER');
    expect(domElements.timer_1.config.isActive).toBe(false);
    expect(domElements.timer_1.config.isRunning).toBe(false);
  });

  it('creates an additional timer when the user explicitly asks for "another timer"', () => {
    const domElements: Record<string, any> = {
      timer_1: {
        id: 'timer_1',
        componentType: 'TIMER',
        config: { seconds: 300, isRunning: true },
        x: 100,
        y: 100,
        width: 340,
        height: 460
      }
    };
    const mockStore: any = {
      domElements,
      updateDomElement: (id: string, el: any) => {
        domElements[id] = el;
      },
    };

    const res = evaluateJevSystemOne('add another timer for 2 minutes', mockStore, null);
    expect(res.handled).toBe(true);
    expect(res.actionTaken).toBe('TOGGLE_TIMER');

    const timers = Object.values(domElements).filter(el => el.componentType === 'TIMER');
    expect(timers.length).toBe(2);
  });
});
