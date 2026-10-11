// pdfjs-dist (used by pdf-parse v2) references browser DOM APIs at module-init time.
// These stubs prevent ReferenceError in Node.js serverless environments.
// Actual values are never used — only text extraction code paths are invoked.
;
globalThis.DOMMatrix ??= class DOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    m11 = 1;
    m12 = 0;
    m13 = 0;
    m14 = 0;
    m21 = 0;
    m22 = 1;
    m23 = 0;
    m24 = 0;
    m31 = 0;
    m32 = 0;
    m33 = 1;
    m34 = 0;
    m41 = 0;
    m42 = 0;
    m43 = 0;
    m44 = 1;
    is2D = true;
    isIdentity = true;
};
globalThis.ImageData ??= class ImageData {
};
globalThis.Path2D ??= class Path2D {
};
export {};
