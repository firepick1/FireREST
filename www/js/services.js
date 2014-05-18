'use strict';

var services = angular.module('FireREST.services', []);

services.value('version', '0.1');

services.factory('BackgroundThread', ['$http', '$interval', function($http, $interval){
  console.log("Initializing BackgroundThread");
  var backgroundThread = {
    worker: function(ticks){return true;},
    t:0,
    error:null
  };

  var promise = $interval(function(ticks) {
    backgroundThread.t++;
    if (!backgroundThread.worker(ticks)) {
      console.log("Background thread exiting. ticks:" + ticks);
      $interval.cancel(promise);
    }
  }, 200);

  return backgroundThread;
}]);
