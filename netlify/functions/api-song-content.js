// Redirect handler for /api/songs/:id to song-content.js function
const { handler } = require('./song-content');

exports.handler = handler;