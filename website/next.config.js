const withPWA = require("next-pwa");

module.exports = {
  pwa: {
    dest: "public",
    register: true,
    skipWaiting: true
  },
  webpack: (config, _options) => {
    return config;
  },
  publicRuntimeConfig: {}
};
