'use strict';

function setup()
{
    var plus = $("h1").asEventStream("click").map(1);
    var minus = $("h2").asEventStream("click").map(-1);
    var both = plus.merge(minus);
    both.onValue(function(val) {
        // Do something here
        //console.log(val);
    });
    
    function add(x, y) { return x + y }
    var counter = both.scan(0, add);
    counter.onValue(function(sum) {
        console.log(sum);
    });
}

$(document).ready(setup);