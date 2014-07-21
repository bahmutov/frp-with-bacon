"use strict";

var updatesOverTime = [];

var width = 960,
    height = 600,
    margins = {
        top: 20,
        bottom: 50,
        left: 70,
        right: 20
    };

var svg = d3.select("svg")
    .attr("width", width)
    .attr("height", height + 200);

var xRange = d3.time.scale().range([margins.left, width - margins.right])
    .domain([new Date(), new Date()]);
var yRange = d3.scale.linear().range([height - margins.bottom, margins.top])
    .domain([0, 0]);
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

// Add a label to the middle of the x axis
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

// Add a label to the middle of the y axis
var yAxisHeight = ((height - margins.bottom) - margins.top) / 2;
yAxisElement.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0)
    .attr("x", -(margins.top + yAxisHeight))
    .attr("dy", "-3.5em")
    .style("text-anchor", "middle")
    .text("Updates per second");

// Define our line series
var lineFunc = d3.svg.line()
    .x(function(d) { return xRange(d.x); })
    .y(function(d) { return yRange(d.y); })
    .interpolate("linear");

var line = svg.append("path")
    .attr("stroke", "blue")
    .attr("fill", "none");

// Add a text element below the chart, which will display the subject of new edits
svg.append("text")
    .attr("class", "edit-text")
    .attr("transform", "translate(" + margins.left + "," + (height + 20)  + ")")
    .attr("width", width - margins.left);

var updateTransitionDuration = 550;

function update(updates, newUser) {
    // Update the ranges of the chart to reflect the new data
    if (updates.length > 0)   {
        xRange.domain(d3.extent(updates, function(d) { return d.x; }));
        yRange.domain([d3.min(updates, function(d) { return d.y; }), 
                       d3.max(updates, function(d) { return d.y; })]);
    }
    
    // Update the line series on the chart
    line.transition()
        .duration(updateTransitionDuration)
        .attr("d", lineFunc(updates));
    
    // Update the axes on the chart
    svg.selectAll("g.x.axis")
        .transition()
        .duration(updateTransitionDuration)
        .call(xAxis);
    svg.selectAll("g.y.axis")
        .transition()
        .duration(updateTransitionDuration)
        .call(yAxis);
    
    // Render the points in the line series
    var points = svg.selectAll("circle").data(updates);
    var pointsEnter = points.enter().append("circle")
        .attr("r", 2)
        .style("fill", "blue");
    
    var pointsUpdate = points
        .transition()
        .duration(updateTransitionDuration)
        .attr("cx", function(d) { return xRange(d.x); })
        .attr("cy", function(d) { return yRange(d.y); });
    
    var pointsExit = points.exit()
        .transition().duration(updateTransitionDuration)
        .remove();
    
    var newUserIndicator = svg.selectAll("circle.new-user").data(newUser);
    newUserIndicator.enter().append("circle")
        .attr("class", "new-user")
        .attr("r", 40)
        .attr("fill", "green")
        .attr("cx", width - margins.right - margins.left)
        .attr("cy", height + 20)
        .attr("opacity", 1e-6)
        .transition()
        .duration(updateTransitionDuration)
        .attr("opacity", 0.75);
    
    newUserIndicator.exit()
        .transition()
        .duration(updateTransitionDuration)
        .attr("cx", width - margins.right - margins.left)
        .attr("cy", height + 20)
        .attr("opacity", 1e-6)
        .remove();
}

var updateEditText = function(latestEdit)   {
    var text = svg.selectAll("text.edit-text").data(latestEdit);

    text.transition()
        .duration(updateTransitionDuration)
        .style("fill-opacity", 1e-6)
        .transition()
        .duration(updateTransitionDuration)
        .style("fill-opacity", 1)
        .text(function (d) { return d; });
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
    update(updatesOverTime, ["newuser"]);
});

// Filter the update stream for unspecified events, which we're taking to mean 
// edits in this case
var editStream = updateStream.filter(function(update) {
    return update.type === "unspecified";
});
editStream.onValue(function(results) {
    updateEditText([results.content]);
});

// Calculate the rate of updates over time
var updateCount = updateStream.scan(0, function(value) {
    return ++value;
});

var sampledUpdates = updateCount.sample(2000);
var totalUpdatesBeforeLastSample = 0;
sampledUpdates.onValue(function(value) {
    updatesOverTime.push({
        x: new Date(), 
        y:(value - totalUpdatesBeforeLastSample) / 2.0
    });
    if (updatesOverTime.length > 20)  {
        updatesOverTime.shift();
    }
    totalUpdatesBeforeLastSample = value;
    update(updatesOverTime, []);
    return value;
});
