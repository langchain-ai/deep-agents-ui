/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  endOfLine: "auto",
  singleAttributePerLine: true,
  plugins: ["prettier-plugin-tailwindcss"],
};

module.exports = config;
