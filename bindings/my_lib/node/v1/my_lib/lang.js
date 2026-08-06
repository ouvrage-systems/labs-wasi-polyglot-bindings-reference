const loader = require('./_generated/loader');

async function formatMessage(name) {
  return loader.call("lang.format", { name });
}

async function reverseString(s) {
  return loader.call("lang.reverse", { s });
}

module.exports = { formatMessage, reverseString };
