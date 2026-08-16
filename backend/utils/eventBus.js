const { EventEmitter } = require("events");

const eventBus = new EventEmitter();
eventBus.setMaxListeners(0); // autant de clients SSE que nécessaire

module.exports = eventBus;
