import '@testing-library/jest-dom/vitest'

HTMLCanvasElement.prototype.getContext = () => ({
  fillStyle: '',
  strokeStyle: '',
  beginPath: () => {},
  arc: () => {},
  fill: () => {},
  fillRect: () => {},
  stroke: () => {},
})

globalThis.IntersectionObserver = class {
  observe() {}

  unobserve() {}

  disconnect() {}
}
