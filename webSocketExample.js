'use strict';

var WebSocket = require('ws');
var ws = new WebSocket('wss://wiki-update-sockets.herokuapp.com/');
ws.on('open', function() {
    console.log('connected');
});
ws.on('close', function() {
    console.log('disconnected');
});
ws.on('message', function(data, flags) {
    // flags.binary will be set if a binary data is received
    // flags.masked will be set if the data was masked
    console.log(data);
});