'use strict';

var services = angular.module('FireREST.services', []);

services.value('version', '0.1');

services.factory('AjaxAdapter', ['$http', 
function($http) {
  console.log("Initializing AjaxAdapter");
  var ajaxAdapter = {
    autoRefresh: false,
    transmit: 1, // 0:error, 1:idle, >1:active-network-requests
    class: function(level) { return ajaxAdapter.transmit > level ? "fr-transmit-on" : ""; },
    status: function() {
      switch (ajaxAdapter.transmit) {
	case 0: return "glyphicon-remove fr-transmit-dead";
	case 1: return "glyphicon-ok fr-transmit-idle";
	default: return "glyphicon-ok fr-transmit-active";
      }
    },
    icon: function() { return ajaxAdapter.autoRefresh ?  "glyphicon-pause" : "glyphicon-repeat"; },
    click: function() { ajaxAdapter.autoRefresh = !ajaxAdapter.autoRefresh; },
    clear: function() { ajaxAdapter.autoRefresh = false; ajaxAdapter.transmit = 1; },
    isIdle: function() { return ajaxAdapter.transmit == 1; },
    isBusy: function() { return ajaxAdapter.transmit > 1; },
    isError: function() { return ajaxAdapter.transmit == 0; },
    start: function() { ajaxAdapter.transmit = ajaxAdapter.transmit ? (ajaxAdapter.transmit+1) : 2; },
    end: function(ok) {
      if (ok) {
	ajaxAdapter.transmit = ajaxAdapter.transmit > 0 ? (ajaxAdapter.transmit-1) : 0;
      } else {
        ajaxAdapter.autoRefresh = false;
        ajaxAdapter.transmit = 0;
      }
    }
  };
  return ajaxAdapter;
}]);

services.factory('ServiceConfig', ['$http', 'AjaxAdapter', '$location',  '$q',
function($http, transmit, location, $q) {
  console.log("Initializing ServiceConfig");
  var service = {
    server: location.host() || "unknownhost",
    port: location.port() || "unknownport",
    name: "/firerest",
    sync: "",
    expand: {},
    expand_icon: function(value) { return "glyphicon fr-collapse-icon glyphicon-wrench"; },
    expand_toggle: function(value) { service.expand[value] = !service.expand[value]; },
    service_url: function() {
      var port = service.port === "" ? "" : (":" + service.port);
      return "http://" + service.server + port + service.name;
    },
    config_url: function() {
      return service.service_url() + "/config.json";
    },
    isValidJSON: function(value) {
      try {
	JSON.parse(value);
      } catch (e) {
      console.log("JSON invalid:" + value);
	return false;
      }
      return true;
    },
    load_config: function(scope) {
      service.scope = scope;
      service.cv = scope.cv;
      var deferred = $q.defer();
      console.log("ServiceConfig.config_load(" + service.config_url() + ")");
      service.config = {"status":"loading..."};
      transmit.start();
      deferred.notify("Sending service config.json request");
      $.ajax({
	url: service.config_url(),
	data: { },
	success: function( data ) {
	  transmit.end(true);
	  console.log("config_load() => " + JSON.stringify(data.FireREST));
	  service.config = data;
	  service.cv.on_load_config(data);
	  deferred.resolve(service.config);
	},
	error: function( jqXHR, ex) {
	  scope.$apply(function(){
	    service.cv.on_load_config(null);
	  });
	  console.error("ServiceConfig.config_load() ex:" + ex + "," + JSON.stringify(jqXHR));
	  transmit.end(false);
	  deferred.reject(ex);
	}
      });
      return deferred.promise;
    }
  }
  return service;
}]);

services.factory('BackgroundThread', ['$http', '$interval', 'AjaxAdapter', 
function($http, $interval, transmit){
  console.log("Initializing BackgroundThread");
  var backgroundThread = {
    worker: function(ticks){return true;},
    t:0,
    error:null
  };

  var promise = $interval(function(ticks) {
    backgroundThread.t++;
    if (transmit.isIdle() && transmit.autoRefresh) {
      if (!backgroundThread.worker(ticks)) {
	console.log("Background thread exiting. ticks:" + ticks);
	$interval.cancel(promise);
      }
    }
  }, 200);

  return backgroundThread;
}]);

services.factory('CvService', ['$http', '$interval', 'AjaxAdapter', 'ServiceConfig',
function($http, $interval, transmit, service){
  console.log("Initializing CvService");
  var cv = {
    resources:['save.fire', 'process.fire'],
    image:[],
    post_data:{},
    image_instances:{},
    image_large:{},
    on_load_config: function(config) {
      cv.camera_names = ["camera n/a"];
      if (config && typeof config.cv === 'object') {
	cv.camera_names = Object.keys(config.cv.camera_map); 
	cv.camera_name = cv.camera_names[0];
	cv.image = ['monitor.jpg'];
	cv.profile_names = cv.camera_name && Object.keys(config.cv.camera_map[cv.camera_name].profile_map);
	cv.profile_name = cv.profile_names[0];
	cv.cve_name = cv.cve_names()[0] || "no-CVE";
      }
      cv.clear_results();
    },
    camera_url: function() {
      return service.service_url() + service.sync + "/cv/" + cv.camera_name + "/";
    },
    cve_names: function() {
      var camera = cv.camera_name && service.config.cv.camera_map[cv.camera_name];
      var profile = camera && camera.profile_map[cv.profile_name];
      return profile && profile.cve_names || [];
    },
    image_path: function(image) {
      var r = cv.image_instances[image] || 0;
      if (image === 'saved.png') {
	return "/cv/" + cv.camera_name + "/" + cv.profile_name + "/cve/" + cv.cve_name + "/" + image + "?r=" + r;
      } else {
	return "/cv/" + cv.camera_name + "/" + image + "?r=" + r;
      }
    },
    image_url: function(image) {
      var r = cv.image_instances[image] || 0;
      if (image === 'saved.png') {
	return cv.camera_url() + cv.profile_name + "/cve/" + cv.cve_name + "/" + image + "?r=" + r;
      } else {
	return cv.camera_url() + image + "?r=" + r;
      }
    },
    image_class: function(image) {
      var isLarge = cv.image_large[image] || false;
      return isLarge ? "fr-img-lg" : "fr-img-sm";
    },
    image_click: function(image) {
      var isLarge = cv.image_large[image] || false;
      cv.image_large[image] = !isLarge;
    },
    image_GET: function(image) {
      cv.image_instances[image] = Math.floor(Math.random()*1000000) ;
    },
    image_GET_icon: function(image) {
      return transmit.autoRefresh && (image === "camera.jpg" || image === 'monitor.jpg') ?
	"glyphicon glyphicon-repeat" : "";
    },
    resource_text: function(resource) {
	return cv.resource_response[resource] || " ";
    },
    resource_path: function(resource) {
      return "/cv/" + cv.camera_name + "/" + cv.profile_name + "/cve/" + cv.cve_name + "/" + resource ;
    },
    resource_url: function(resource) {
      return cv.camera_url() + cv.profile_name + "/cve/" + cv.cve_name + "/" + resource ;
    },
    resource_class: function(resource) {
      return cv.resource_classname[resource] || "fr-json-ok";
    },
    resource_XHR: function(resource, classname, response, ok) {
      service.scope.$apply(function(){
        console.log('resource_XHR' + resource + response);
	cv.resource_response[resource] = response;
	cv.resource_classname[resource] = classname;
        if (resource === 'save.fire' || resource === 'process.fire') {
	  var t = Math.floor(Math.random()*1000000) ;
	  cv.image_instances['monitor.jpg'] = t;
	  resource === 'save.fire' && (cv.image_instances['saved.png'] = t);
	  resource === 'process.fire' && (cv.image_instances['output.jpg'] = t);
	}

	transmit.end(true);
      });
    },
    clear_results: function() {
      cv.resource_response = {};
      cv.resource_classname = {};
    },
    resource_GET_icon: function(action) {
      return transmit.autoRefresh && (action === "process.fire") ?
        "glyphicon glyphicon-repeat" : "";
    },
    resource_GET: function(resource) {
      console.log("GET " + resource);
      transmit.start();
      $.ajax({
	url: cv.resource_url(resource),
	data: { r: Math.floor(Math.random()*1000000) },
	success: function( data ) {
	  if (typeof data === 'object') {
	    data = JSON.stringify(data);
	  }
	  data = ("" + data).trim();
	  cv.resource_XHR(resource, "fr-json-ok", data, true);
	},
	error: function( jqXHR, ex) {
	  cv.resource_XHR(resource, "fr-json-err", JSON.stringify(jqXHR), false);
	}
      });
    },
    resource_POST: function(resource) {
      transmit.start();
      var data = cv.post_data[resource];
      $.ajax({
        type:"POST",
	url: cv.resource_url(resource),
	data: data,
	success: function() {
	  cv.resource_XHR(resource, "fr-json-ok", data, true);
	},
	error: function( jqXHR, ex) {
	  cv.resource_XHR(resource, "fr-json-err", JSON.stringify(jqXHR), false);
	}
      });
    },
    resource_isPOST: function(resource) {
      return resource === 'properties.json';
    }
  };
  return cv;
}]);
