'use strict';
var bootstrap = angular.module('FireREST.bootstrap', ['ui.bootstrap']);

var controllers = angular.module('FireREST.controllers', []);

controllers.controller('MainCtrl', ['$scope','$location', 'BackgroundThread',
  function(scope, location, bg) {
    scope.cv = {
      "resources":['save', 'process'],
      "image":[],
      "server":location.host() || "unknownhost",
      "port":location.port() || "unknownport",
      "service": "/firerest",
      "collapse": {"camera":true, "cve":true, "service":true},
      "image_instances":{},
      "image_large":{}
      };
    scope.transmit_enabled = false;
    scope.transmit = 1; // 0:error, 1:idle, >1:active-network-requests

    scope.service_url = function() {
      var port = scope.cv.port === "" ? "" : (":" + scope.cv.port);
      return "http://" + scope.cv.server + port + scope.cv.service;
    };
    scope.camera_url = function() {
      return scope.service_url() + "/cv/" + scope.cv.camera_name + "/";
    };

    scope.transmit_status = function() {
      switch (scope.transmit) {
	case 0: return "glyphicon-remove fr-transmit-dead";
	case 1: return "glyphicon-ok fr-transmit-idle";
	default: return "glyphicon-ok fr-transmit-active";
      }
    }
    scope.transmit_icon = function() {
      return scope.transmit_enabled ?  "glyphicon-pause" : "glyphicon-repeat";
    }
    scope.transmit_click = function() {
      scope.transmit_enabled = !scope.transmit_enabled;
    }
    scope.transmit_isIdle = function() { return scope.transmit == 1; }
    scope.transmit_isBusy = function() { return scope.transmit > 1; }
    scope.transmit_isError = function() { return scope.transmit == 0; }
    scope.transmit_start = function() {
      scope.transmit = scope.transmit ? (scope.transmit+1) : 2;
    }
    scope.transmit_end = function(ok) {
      if (ok) {
	scope.transmit = scope.transmit > 0 ? (scope.transmit-1) : 0;
      } else {
        scope.transmit_enabled = false;
        scope.transmit = 0;
      }
    }
    
    scope.config_url = function() {
      return scope.service_url() + "/config.json";
    }
    scope.cve_names = function() {
      var camera = scope.cv.camera_name && scope.config.cv.camera_map[scope.cv.camera_name];
      var profile = camera && camera.profile_map[scope.cv.profile_name];
      return profile && profile.cve_names || [];
    }
    scope.config_load = function() {
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
	    }
	  });
	},
	error: function( jqXHR, ex) {
	  console.error("config_load() ex:" + ex + "," + JSON.stringify(jqXHR));
	  scope.$apply(function(){
	    scope.transmit_end(false);
	    scope.cv.camera_names = ["camera n/a"];
	  });
	}
      });
    };
    scope.config_load();

    scope.collapse_icon = function(value) {
      return "glyphicon fr-collapse-icon " +
        (scope.cv.collapse[value] ? "glyphicon-wrench" : "glyphicon-wrench");
    }
    scope.collapse_toggle = function(value) {
      scope.cv.collapse[value] = !scope.cv.collapse[value];
    }

    scope.clear_results = function() {
      scope.resource_response = {};
      scope.resource_classname = {};
    };
    scope.clear_results();

    scope.image_path = function(image) {
      var r = scope.cv.image_instances[image] || 0;
      if (image === 'saved.png') {
	return "/cv/" + scope.cv.camera_name + "/" + scope.cv.profile_name + "/cve/" + scope.cv.cve_name + "/" + image + "?r=" + r;
      } else {
	return "/cv/" + scope.cv.camera_name + "/" + image + "?r=" + r;
      }
    };
    scope.image_url = function(image) {
      var r = scope.cv.image_instances[image] || 0;
      if (image === 'saved.png') {
	return scope.camera_url() + scope.cv.profile_name + "/cve/" + scope.cv.cve_name + "/" + image + "?r=" + r;
      } else {
	return scope.camera_url() + image + "?r=" + r;
      }
    };
    scope.image_class = function(image) {
      var isLarge = scope.cv.image_large[image] || false;
      return isLarge ? "fr-img-lg" : "fr-img-sm";
    }
    scope.image_click = function(image) {
      var isLarge = scope.cv.image_large[image] || false;
      scope.cv.image_large[image] = !isLarge;
    };
    scope.image_GET = function(image) {
      scope.cv.image_instances[image] = Math.floor(Math.random()*1000000) ;
    };
    scope.image_GET_icon = function(image) {
      return scope.transmit_enabled && (image === "camera.jpg" || image === 'monitor.jpg') ?
        "glyphicon glyphicon-repeat" : "";
    }
    
    scope.resource_text = function(resource) {
      return scope.resource_response[resource] || " ";
    }
    scope.resource_path = function(resource) {
      return "/cv/" + scope.cv.camera_name + "/" + scope.cv.profile_name + "/cve/" + scope.cv.cve_name + "/" + resource + ".json";
    };
    scope.resource_url = function(resource) {
      return scope.camera_url() + scope.cv.profile_name + "/cve/" + scope.cv.cve_name + "/" + resource + ".json";
    };
    scope.resource_class = function(resource) {
      return scope.resource_classname[resource] || "fr-json-ok";
    };
    scope.resource_XHR = function(resource, classname, response, ok) {
      scope.$apply(function(){
        //console.log('resource_XHR' + resource + response);
	scope.resource_response[resource] = response;
	scope.resource_classname[resource] = classname;
	var t = Math.floor(Math.random()*1000000) ;
	scope.cv.image_instances['camera.jpg'] = t;
	scope.cv.image_instances['monitor.jpg'] = t;
	resource === 'save' && (scope.cv.image_instances['saved.png'] = t);
	resource === 'process' && (scope.cv.image_instances['output.jpg'] = t);
	scope.transmit_end(true);
      });
    }
    scope.resource_GET_icon = function(action) {
      return scope.transmit_enabled && (action === "process") ?
        "glyphicon glyphicon-repeat" : "";
    }
    scope.resource_GET = function(resource) {
	scope.transmit_start();
	$.ajax({
	  url: scope.resource_url(resource),
	  data: { r: Math.floor(Math.random()*1000000) },
	  success: function( data ) {
	    scope.resource_XHR(resource, "fr-json-ok", JSON.stringify(data), true);
	  },
	  error: function( jqXHR, ex) {
	    scope.resource_XHR(resource, "fr-json-err", JSON.stringify(jqXHR), false);
	  }
	});
      }

    bg.worker = function(ticks) {
     if (scope.transmit_isIdle() && scope.transmit_enabled) {
       if ((ticks % 5) === 0 ) {
	 scope.cv.resources.indexOf('process') >= 0 && scope.resource_GET('process');
       } else if ((ticks % 3) === 0 ) {
	 scope.image_GET('monitor.jpg');
       } else if ((ticks % 3) === 1 ) {
	 scope.image_GET('camera.jpg');
       }
     }
     return true;
    }
}]);
