require("@testing-library/jest-dom");

// Add ReadableStream polyfill for testing
if (typeof ReadableStream === "undefined") {
  global.ReadableStream = require("stream/web").ReadableStream;
}