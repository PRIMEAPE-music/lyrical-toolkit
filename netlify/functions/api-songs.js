// Redirect handler for /api/songs to songs.js function
const { handler } = require('./songs');

exports.handler = handler;