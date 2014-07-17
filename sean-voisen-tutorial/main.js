'use strict';

function setup()
{
    var buttonStream = $("#searchButton").asEventStream("click");
    var queryProperty = $("#searchInput").asEventStream("keydown")
        .map('.target.value').toProperty();
  var enterStream = $("#searchInput").asEventStream("keyup")
    .filter(function(e) {
      return e.keyCode == 13;
    }
  );

  var searchStream = queryProperty
    .sampledBy(Bacon.mergeAll(buttonStream, enterStream))
    .flatMapLatest(doSearch);
    
    function doSearch(query)
    {
        var url = 'http://en.wikipedia.org/w/api.php?action=opensearch'
          + '&format=json' 
          + '&search=' + encodeURI(query);
        return Bacon.fromPromise($.ajax({url:url, dataType:"jsonp"}));
    }
    
    searchStream.onValue(function(results) {
        console.log(results);
    });
    
    var totalSearches = searchStream.scan(0, function(value) { 
        return ++value;
    });
    
    totalSearches.onValue(function(value) {
        console.log(value);
    });
}

$(document).ready(setup);