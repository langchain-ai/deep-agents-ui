/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "./tsconfig.jest.json",
      }
    ],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(@testing-library|react-markdown|remark-|unified|unist-|mdast-|micromark|devlop|hast-|vfile-|trough-|bail|is-plain-obj|ccount|comma-separated-tokens|decode-named-character-reference|escape-string-regexp|github-slugger|html-url-attributes|property-information|space-separated-tokens|stringify-entities|web-namespaces|xtend)/)"
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.cjs"],
  moduleDirectories: ["node_modules", "<rootDir>"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|scss|sass)$": "identity-obj-proxy",
  },
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
};