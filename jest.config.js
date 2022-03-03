const tsPreset = require("ts-jest/jest-preset");

module.exports = {
  ...tsPreset,
  testMatch: ["/**/*.test.ts"],
};
