const n = require("./notes.json");
module.exports = n.map(x => `ZEIT: ${x.start}${x.end ? " – " + x.end : ""}\n\n${x.text}`);
