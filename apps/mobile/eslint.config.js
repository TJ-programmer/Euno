// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // react-hooks/immutability conflicts with react-native-reanimated's
    // imperative shared-value API (`.value =`), which is by-design.
    rules: {
      "react-hooks/immutability": "off",
    },
  },
]);
