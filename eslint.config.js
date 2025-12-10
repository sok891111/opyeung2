import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  js.configs.recommended,
  {
    ignores: ["dist"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      sourceType: "module"
    },
    plugins: {
      "react-hooks": reactHooks
    },
    rules: {
      "no-unused-vars": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn"
    }
  }
];

