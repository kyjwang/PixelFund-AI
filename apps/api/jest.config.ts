export default {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: "test/(?!integration/).*\\.spec\\.ts$",
  transform: { "^.+\\.(t|j)s$": "ts-jest" }
};
