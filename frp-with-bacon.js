"use strict";

var width = 960,
    height = 600,
    margins = {
        top: 20,
        bottom: 50,
        left: 70,
        right: 20
    };

var updatesOverTime = [];
var newUserTimes = [];

var svg = d3.select("svg")
    .attr("width", width)
    .attr("height", height);

var xRange = d3.time.scale().range([margins.left, width - margins.right])
    .domain([d3.min(updatesOverTime, function(d) { return d.x; }), d3.max(updatesOverTime, function(d) { return d.x; })]);
var yRange = d3.scale.linear().range([height - margins.bottom, margins.top])
    .domain([d3.min(updatesOverTime, function(d) { return d.y; }), d3.max(updatesOverTime, function(d) { return d.y; })]);
var xAxis = d3.svg.axis()
    .scale(xRange)
    .tickSize(5)
    .tickSubdivide(true)
    .tickFormat(d3.time.format("%X"));
var yAxis = d3.svg.axis()
    .scale(yRange)
    .tickSize(5)
    .orient("left")
    .tickSubdivide(true);

var xAxisElement = svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (height - margins.bottom) + ")")
    .call(xAxis);

var xAxisWidth = ((width - margins.right) - margins.left) / 2;
xAxisElement.append("text")
    .attr("x", margins.left + xAxisWidth)
    .attr("y", 0)
    .attr("dy", "3em")
    .style("text-anchor", "middle")
    .text("Time");

var yAxisElement = svg.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + margins.left + ",0)")
    .call(yAxis);

var yAxisHeight = ((height - margins.bottom) - margins.top) / 2;
yAxisElement.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0)
    .attr("x", -(margins.top + yAxisHeight))
    .attr("dy", "-3.5em")
    .style("text-anchor", "middle")
    .text("Updates per second");

var lineFunc = d3.svg.line()
    .x(function(d) { return xRange(d.x); })
    .y(function(d) { return yRange(d.y); })
    .interpolate("linear");

var line = svg.append("path")
    .attr("d", lineFunc(updatesOverTime))
    .attr("stroke", "blue")
    .attr("fill", "none");

var updateTransitionDuration = 550;

function update() {
    xRange.domain(d3.extent(updatesOverTime, function(d) { return d.x; }));
    yRange.domain([d3.min(updatesOverTime, function(d) { return d.y; }), d3.max(updatesOverTime, function(d) { return d.y; })]);
    
    var firstNewUserTime = newUserTimes[0];
    var xAxisMin = xRange.domain()[0];
    if (firstNewUserTime < xAxisMin) {
        console.log(firstNewUserTime + " < " + xAxisMin);
        newUserTimes.shift();
    }
    
    line.transition().duration(updateTransitionDuration).attr("d", lineFunc(updatesOverTime));
    svg.selectAll("g.x.axis").transition().duration(updateTransitionDuration).call(xAxis);
    svg.selectAll("g.y.axis").transition().duration(updateTransitionDuration).call(yAxis);
    
    var points = svg.selectAll("circle").data(updatesOverTime);
    var pointsEnter = points.enter().append("circle")
        .attr("r", 2)
        .style("fill", "blue");
    
    var pointsUpdate = points.transition().duration(updateTransitionDuration)
        .attr("cx", function(d) { return xRange(d.x); })
        .attr("cy", function(d) { return yRange(d.y); });
    
    var pointsExit = points.exit()
        .transition().duration(updateTransitionDuration)
        .remove();
    
    var newUserLines = svg.selectAll("rect").data(newUserTimes);
    var newUsersEnter = newUserLines.enter().append("rect")
        .attr("width", 5)
        .attr("fill-opacity", 0.001)
        .attr("fill", "red")
    
    var newUsersUpdate = newUserLines.transition().duration(updateTransitionDuration)
        .attr("x", function(d) { return xRange(d); })
        .attr("y", margins.top)
        .attr("height", height - margins.bottom - margins.top)
        .attr("fill-opacity", 0.5);
    
    var newUsersExit = newUserLines.exit()
        .transition().duration(updateTransitionDuration)    
        .remove();
    
//    var lastElement = data[data.length - 1];
//    console.log(yRange(5));
//    console.log(yRange(0));
//    svg.append("line")
//        .attr("x1", xRange(lastElement.x))
//        .attr("x2", xRange(lastElement.x))
//        .attr("y1", margins.top)
//        .attr("y2", height - margins.bottom)
//        .attr("stroke", "red");
    
//    var text = svg.selectAll("text").data(data);
//
//    // UPDATE
//    // Update old elements as needed.
//    text.attr("class", "update")
//        .transition()
//        .duration(550)
//        .style("fill-opacity", 1e-6)
//        .transition()
//        .duration(550)
//        .style("fill-opacity", 1)
//        .text(function (d) { return d; });
//    
//    // ENTER
//    // Create new elements as needed.
//    var enterText = svg.selectAll("text").data(data).enter()
//        .append("text")
//        .attr("class", "enter")
//        .attr("dy", ".35em")
//        .attr("y", -60)
//        .style("fill-opacity", 1e-6)
//        .text(function (d) { return d; })
//        .transition()
//        .duration(750)
//        .attr("y", 0)
//        .style("fill-opacity", 1);
//
//    // EXIT
//    // Remove old elements as needed.
//    text.exit()
//        .attr("class", "exit")
//        .transition()
//        .duration(750)
//        .attr("y", 60)
//        .style("fill-opacity", 1e-6)
//        .remove();
}

// Create our websocket to get wiki updates
var ws = new WebSocket("ws://wiki-update-sockets.herokuapp.com/");
ws.onopen = function () {
    console.log("Connection opened");
};

ws.onclose = function () {
    console.log("Connection is closed...");
};

var updateStream = Bacon.fromEventTarget(ws, "message").map(function(event) {
    var dataString = event.data;
    return JSON.parse(dataString);
});

// Filter the update stream for newuser events
var newUserStream = updateStream.filter(function(update) {
    return update.type === "newuser";
});
newUserStream.onValue(function(results) {
    newUserTimes.push(new Date());
});

// Filter the update stream for unspecified events, which we're taking to mean edits in this case
var editStream = updateStream.filter(function(update) {
    return update.type === "unspecified";
});
editStream.onValue(function(results) {
    console.log(JSON.stringify(results));
});

// Calculate the rate of updates over time
var updateCount = updateStream.scan(0, function(value) {
    return ++value;
});

var sampledUpdates = updateCount.sample(2000);
var totalUpdatesBeforeLastSample = 0;
sampledUpdates.onValue(function(value) {
    var now = new Date();
    updatesOverTime.push({
        x: now, 
        y:(value - totalUpdatesBeforeLastSample) / 2.0
    });
    if (updatesOverTime.length > 20)  {
        updatesOverTime.shift();
    }
    totalUpdatesBeforeLastSample = value;
    update();
    return value;
});
