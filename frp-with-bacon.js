"use strict";

var pageData = [];
var editsOverTime = [];

var width = 960,
    height = 500;

var svg = d3.select("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(32," + (height / 2) + ")");

function update(data) {
    var text = svg.selectAll("text").data(data);

    // UPDATE
    // Update old elements as needed.
    text.attr("class", "update")
        .transition()
        .duration(550)
        .style("fill-opacity", 1e-6)
        .transition()
        .duration(550)
        .style("fill-opacity", 1)
        .text(function (d) { return d; });
    
    // ENTER
    // Create new elements as needed.
    var enterText = svg.selectAll("text").data(data).enter()
        .append("text")
        .attr("class", "enter")
        .attr("dy", ".35em")
        .attr("y", -60)
        .style("fill-opacity", 1e-6)
        .text(function (d) { return d; })
        .transition()
        .duration(750)
        .attr("y", 0)
        .style("fill-opacity", 1);

    // EXIT
    // Remove old elements as needed.
    text.exit()
        .attr("class", "exit")
        .transition()
        .duration(750)
        .attr("y", 60)
        .style("fill-opacity", 1e-6)
        .remove();
}

// The initial display.
update(pageData);

// Create our websocket to get wiki updates
var ws = new WebSocket("ws://wiki-update-sockets.herokuapp.com/");
ws.onopen = function () {
    console.log("Connection opened");
};

ws.onclose = function () {
    console.log("Connection is closed...");
};

var messageStream = Bacon.fromEventTarget(ws, "message").map(function(event) {
    var dataString = event.data;
    return JSON.parse(dataString);
});

// Filter the message stream for newuser events
var newUserStream = messageStream.filter(function(message) {
    return message.type === "newuser";
});
newUserStream.onValue(function(results) {
    console.log(JSON.stringify(results));
});

// Filter the message stream for unspecified events, which we're taking to mean edits in this case
var editStream = messageStream.filter(function(message) {
    return message.type === "unspecified";
});
editStream.onValue(function(results) {
    pageData = [JSON.stringify(results)];
    update(pageData);
});

// Calculate the rate of edits over time
var messageCount = messageStream.scan(0, function(value) {
    return ++value;
});

var sampledMessages = messageCount.sample(5000);
var totalEditsBeforeLastSample = 0;
sampledMessages.onValue(function(value) {
    editsOverTime.push((value - totalEditsBeforeLastSample) / 5.0);
    totalEditsBeforeLastSample = value;
    return value;
});
