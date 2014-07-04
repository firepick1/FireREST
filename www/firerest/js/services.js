'use strict';

var services = angular.module('FireREST.services', []);

services.value('version', '0.1');

services.factory('AjaxAdapter', ['$http', function($http) {
  console.log("Initializing AjaxAdapter");
  var ajaxAdapter = {
    enabled: false,
    transmit: 1, // 0:error, 1:idle, >1:active-network-requests
    class: function(level) { return ajaxAdapter.transmit > level ? "fr-transmit-on" : ""; },
    status: function() {
      switch (ajaxAdapter.transmit) {
	case 0: return "glyphicon-remove fr-transmit-dead";
	case 1: return "glyphicon-ok fr-transmit-idle";
	default: return "glyphicon-ok fr-transmit-active";
      }
    },
    icon: function() { return ajaxAdapter.enabled ?  "glyphicon-pause" : "glyphicon-repeat"; },
    click: function() { ajaxAdapter.enabled = !ajaxAdapter.enabled; },
    clear: function() { ajaxAdapter.enabled = false; ajaxAdapter.transmit = 1; },
    isIdle: function() { return ajaxAdapter.transmit == 1; },
    isBusy: function() { return ajaxAdapter.transmit > 1; },
    isError: function() { return ajaxAdapter.transmit == 0; },
    start: function() { ajaxAdapter.transmit = ajaxAdapter.transmit ? (ajaxAdapter.transmit+1) : 2; },
    end: function(ok) {
      if (ok) {
	ajaxAdapter.transmit = ajaxAdapter.transmit > 0 ? (ajaxAdapter.transmit-1) : 0;
      } else {
        ajaxAdapter.enabled = false;
        ajaxAdapter.transmit = 0;
      }
    }
  };
  return ajaxAdapter;
}]);

services.factory('ServiceConfig', ['$http', 'AjaxAdapter', function($http, transmit) {
  console.log("Initializing ServiceConfig");
  var config = {"hello":"there"}

  transmit.enabled = true;
  console.log(transmit.icon());
  /*
  console.log("Loading config.json from " + scope.config_url());
  scope.config = {"status":"loading..."};
  scope.transmit_start();
  $.ajax({
    url: scope.config_url(),
    data: { },
    success: function( data ) {
      scope.$apply(function(){
	scope.transmit_end(true);
	console.log(JSON.stringify(data));
	scope.config = data;
	if (typeof scope.config.cv === 'object') {
	  var cv = scope.cv;
	  cv.camera_names = Object.keys(scope.config.cv.camera_map); 
	  cv.camera_name = cv.camera_names[0];
	  cv.image = ['monitor.jpg'];
	  cv.profile_names = cv.camera_name && Object.keys(scope.config.cv.camera_map[cv.camera_name].profile_map);
	  cv.profile_name = cv.profile_names[0];
	  cv.cve_name = scope.cve_names()[0] || "no-CVE";
	  scope.clear_results();
	  bg.worker = scope.worker;
	}
      });
    },
    error: function( jqXHR, ex) {
      console.error("config_load() ex:" + ex + "," + JSON.stringify(jqXHR));
      scope.$apply(function(){
	scope.transmit_end(false);
	scope.cv.camera_names = ["camera n/a"];
	scope.clear_results();
      });
    }
  });
};
*/
  return config;
}]);

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
