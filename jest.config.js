module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["./jest.setup.js"],
  transformIgnorePatterns: ["/node_modules/(?!core-js).+"],
};
