import type { Timer } from '../../../application/ports/timer';

export const browserTimer: Timer = {
  after: (ms, fn) => {
    const id = setTimeout(fn, ms);
    return () => {
      clearTimeout(id);
    };
  },
};
