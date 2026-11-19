import next from "eslint-config-next";

const config = [...next, { ignores: [".next/**", "node_modules/**", "ngcx-website/**"] }];
export default config;
