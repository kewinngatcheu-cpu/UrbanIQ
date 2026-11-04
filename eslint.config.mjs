import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", "node_modules/**", ".data/**", "scripts/**", "tests/**", "next-env.d.ts"] },
  ...nextVitals,
  ...nextTs,
  {
    // Server Components render once per request; reading the clock there is intended (no re-renders).
    files: ["src/app/**/page.tsx"],
    rules: { "react-hooks/purity": "off" },
  },
];

export default config;
