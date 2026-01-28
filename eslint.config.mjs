import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import securityNode from "eslint-plugin-security-node";

export default tseslint.config(
  {
    ignores: [
      "eslint.config.mjs", 
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "*.min.js",
      "*.d.ts",
      ".next/**",
      ".nuxt/**",
      "public/**",
      "static/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    plugins: {
      "@stylistic": stylistic,
      "security-node": securityNode,
    },

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      ...securityNode.configs.recommended.rules,
      
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",

      "no-console": ["error", { allow: ["error", "info", "warn"] }],
      eqeqeq: ["error", "always"],
      curly: "error",
      "prefer-const": ["error"],
      "no-duplicate-imports": ["error"],
      "no-await-in-loop": "error",
      "array-callback-return": ["error", { allowImplicit: false }],
      "no-unreachable": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-var": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-unsafe-finally": "error",
      "no-unsafe-negation": "error",
      complexity: ["warn", 10],
      "max-depth": ["error", 5],
      "prefer-destructuring": ["error", { object: true, array: false }],
      "prefer-template": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-use-before-define": ["error", { functions: false, classes: true }],
      "@typescript-eslint/no-duplicate-enum-values": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/consistent-type-definitions": ["warn", "interface"],
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/prefer-readonly": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-inferrable-types": "error",
      "@typescript-eslint/prefer-for-of": "error",
      "@typescript-eslint/prefer-includes": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/promise-function-async": "error",
      "@typescript-eslint/no-unnecessary-condition": ["warn", {
        allowConstantLoopConditions: false
      }],

      "@stylistic/no-multi-spaces": "error",
      "@stylistic/semi": ["error", "always"],
      "@stylistic/quotes": ["error", "single"],
      "@stylistic/no-extra-semi": ["error"],
      "@stylistic/type-annotation-spacing": ["error", { before: false, after: true }],
      "@stylistic/object-curly-spacing": ["error", "always"],
      "@stylistic/comma-dangle": ["error", "always-multiline"],
      "@stylistic/indent": ["error", 2],
      "@stylistic/max-len": ["error", { code: 200, ignoreUrls: true }],
      "@stylistic/brace-style": ["error", "1tbs"],
      "@stylistic/comma-spacing": ["error", { before: false, after: true }],
      "@stylistic/key-spacing": ["error", { beforeColon: false, afterColon: true }],
    },
  },
);