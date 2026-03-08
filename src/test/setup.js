import '@testing-library/jest-dom/vitest'

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => ({
    fillStyle: '',
    strokeStyle: '',
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    fillRect: () => {},
    stroke: () => {},
  })
}

globalThis.IntersectionObserver = class {
  observe() {}

  unobserve() {}

  disconnect() {}
}
