// pdfjs-dist (pulled in by pdf-parse) tries to load @napi-rs/canvas in Node to get
// DOMMatrix/ImageData/Path2D. When that native binding fails to load (common on Windows,
// and especially inside a OneDrive-synced folder), pdfjs-dist crashes at import time with
// "DOMMatrix is not defined" — even though we only use pdf-parse for text extraction and
// never actually render anything to a canvas.
//
// These are minimal stand-ins, just enough that pdfjs-dist's module-load-time code (and any
// non-rendering code paths) don't throw. Must be imported FIRST, before anything that
// imports 'pdf-parse'.

if (typeof globalThis.DOMMatrix === "undefined") {
  class DOMMatrixPolyfill {
    constructor() {
      this.a = 1;
      this.b = 0;
      this.c = 0;
      this.d = 1;
      this.e = 0;
      this.f = 0;
    }
    multiply() {
      return new DOMMatrixPolyfill();
    }
    translate() {
      return new DOMMatrixPolyfill();
    }
    scale() {
      return new DOMMatrixPolyfill();
    }
    inverse() {
      return new DOMMatrixPolyfill();
    }
    toString() {
      return "matrix(1, 0, 0, 1, 0, 0)";
    }
  }
  globalThis.DOMMatrix = DOMMatrixPolyfill;
}

if (typeof globalThis.ImageData === "undefined") {
  class ImageDataPolyfill {
    constructor(dataOrWidth, widthOrHeight, height) {
      if (typeof dataOrWidth === "number") {
        this.width = dataOrWidth;
        this.height = widthOrHeight;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        this.data = dataOrWidth;
        this.width = widthOrHeight;
        this.height = height;
      }
    }
  }
  globalThis.ImageData = ImageDataPolyfill;
}

if (typeof globalThis.Path2D === "undefined") {
  class Path2DPolyfill {
    moveTo() {}
    lineTo() {}
    closePath() {}
    rect() {}
    arc() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
  }
  globalThis.Path2D = Path2DPolyfill;
}
