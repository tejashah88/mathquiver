/**
 * Jest setup file for Playwright tests
 * Polyfills browser globals required by Playwright in Node.js environment
 */

// Polyfill setImmediate for Playwright in Node.js environment
if (typeof setImmediate === 'undefined') {
  global.setImmediate = (callback: (...args: unknown[]) => void, ...args: unknown[]) => {
    return setTimeout(callback, 0, ...args) as unknown as NodeJS.Immediate;
  };
}

// Polyfill clearImmediate if needed
if (typeof clearImmediate === 'undefined') {
  global.clearImmediate = (immediate: NodeJS.Immediate) => {
    return clearTimeout(immediate as unknown as NodeJS.Timeout);
  };
}
