'use strict';

var services = angular.module('FireREST.services', []);

services.value('version', '0.1');

services.factory('AjaxAdapter', ['$http', 
function($http) {
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

services.factory('ServiceConfig', ['$http', 'AjaxAdapter', '$location', 
function($http, transmit, location) {
  console.log("Initializing ServiceConfig");
  var service = {
    server: location.host() || "unknownhost",
    port: location.port() || "unknownport",
    name: "/firerest",
    protocol: "",
    service_url: function() {
      var port = service.port === "" ? "" : (":" + service.port);
      return "http://" + service.server + port + service.name;
    },
    config_url: function() {
      return service.service_url() + "/config.json";
    }
  }
  return service;
}]);

services.factory('BackgroundThread', ['$http', '$interval', 
function($http, $interval){
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
