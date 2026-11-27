import next from "eslint-config-next";

const config = [...next, { ignores: [".next/**", "node_modules/**", "summer-escape/**"] }];
export default config;
