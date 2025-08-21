// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock canvas context used by libraries like jsPDF
window.HTMLCanvasElement.prototype.getContext = () => ({});

// Mock libraries that require browser-specific features
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    text: jest.fn(),
    save: jest.fn()
  }));
});

jest.mock('html2canvas', () => jest.fn());

// Provide a basic ResizeObserver mock
class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserver;
