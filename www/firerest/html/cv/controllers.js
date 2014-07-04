'use strict';
var bootstrap = angular.module('FireREST.bootstrap', ['ui.bootstrap']);

var controllers = angular.module('FireREST.controllers', []);

controllers.controller('MainCtrl', 
  ['$scope','$location', 'BackgroundThread', 'ServiceConfig', 'AjaxAdapter',
  function(scope, location, bg, config, transmit) {
    scope.cv = {
      "resources":['save.fire', 'process.fire'],
      "image":[],
      "server":location.host() || "unknownhost",
      "port":location.port() || "unknownport",
      "post_data":{},
      "service": "/firerest",
      "protocol":"",
      "collapse": {"camera":true, "cve":true, "service":true},
      "image_instances":{},
      "image_large":{}
      };
    transmit.clear();
    scope.transmit = transmit;

    scope.service_url = function() {
      var port = scope.cv.port === "" ? "" : (":" + scope.cv.port);
      return "http://" + scope.cv.server + port + scope.cv.service;
    };
    scope.camera_url = function() {
      return scope.service_url() + scope.cv.protocol + "/cv/" + scope.cv.camera_name + "/";
    };

    scope.config_url = function() {
      return scope.service_url() + "/config.json";
    }
    scope.cve_names = function() {
      var camera = scope.cv.camera_name && scope.config.cv.camera_map[scope.cv.camera_name];
      var profile = camera && camera.profile_map[scope.cv.profile_name];
      return profile && profile.cve_names || [];
    }
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
      return transmit.enabled && (image === "camera.jpg" || image === 'monitor.jpg') ?
        "glyphicon glyphicon-repeat" : "";
    }
    
    scope.resource_text = function(resource) {
      return scope.resource_response[resource] || " ";
    }
    scope.resource_path = function(resource) {
      return "/cv/" + scope.cv.camera_name + "/" + scope.cv.profile_name + "/cve/" + scope.cv.cve_name + "/" + resource ;
    };
    scope.resource_url = function(resource) {
      return scope.camera_url() + scope.cv.profile_name + "/cve/" + scope.cv.cve_name + "/" + resource ;
    };
    scope.resource_class = function(resource) {
      return scope.resource_classname[resource] || "fr-json-ok";
    };
    scope.resource_XHR = function(resource, classname, response, ok) {
      scope.$apply(function(){
        //console.log('resource_XHR' + resource + response);
	scope.resource_response[resource] = response;
	scope.resource_classname[resource] = classname;
        if (resource === 'save.fire' || resource === 'process.fire') {
	  var t = Math.floor(Math.random()*1000000) ;
	  scope.cv.image_instances['monitor.jpg'] = t;
	  resource === 'save.fire' && (scope.cv.image_instances['saved.png'] = t);
	  resource === 'process.fire' && (scope.cv.image_instances['output.jpg'] = t);
	}

	transmit.end(true);
      });
    }
    scope.resource_GET_icon = function(action) {
      return transmit.enabled && (action === "process.fire") ?
        "glyphicon glyphicon-repeat" : "";
    }
    scope.resource_GET = function(resource) {
      transmit.start();
      $.ajax({
	url: scope.resource_url(resource),
	data: { r: Math.floor(Math.random()*1000000) },
	success: function( data ) {
	  if (typeof data === 'object') {
	    data = JSON.stringify(data);
	  }
	  data = ("" + data).trim();
	  scope.resource_XHR(resource, "fr-json-ok", data, true);
	},
	error: function( jqXHR, ex) {
	  scope.resource_XHR(resource, "fr-json-err", JSON.stringify(jqXHR), false);
	}
      });
    }
    scope.isValidJSON = function(value) {
      try {
	JSON.parse(value);
      } catch (e) {
	return false;
      }
      return true;
    }
    scope.resource_POST = function(resource) {
      transmit.start();
      var data = scope.cv.post_data[resource];
      $.ajax({
        type:"POST",
	url: scope.resource_url(resource),
	data: data,
	success: function() {
	  scope.resource_XHR(resource, "fr-json-ok", data, true);
	},
	error: function( jqXHR, ex) {
	  scope.resource_XHR(resource, "fr-json-err", JSON.stringify(jqXHR), false);
	}
      });
    }
    scope.resource_isPOST = function(resource) {
      return resource === 'properties.json';
    }
    scope.worker = function(ticks) {
     if (transmit.isIdle() && transmit.enabled) {
       if ((ticks % 5) === 0 ) {
	 scope.cv.resources.indexOf('process.fire') >= 0 && scope.resource_GET('process.fire');
       } else if ((ticks % 3) === 0 ) {
	 scope.image_GET('monitor.jpg');
       } else if ((ticks % 3) === 1 ) {
	 scope.image_GET('camera.jpg');
       }
     }
     return true;
    }

    scope.config_load = function() {
      console.log("Loading config.json from " + scope.config_url());
      scope.config = {"status":"loading..."};
      transmit.start();
      $.ajax({
	url: scope.config_url(),
	data: { },
	success: function( data ) {
	  scope.$apply(function(){
	    transmit.end(true);
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
	    transmit.end(false);
	    scope.cv.camera_names = ["camera n/a"];
	    scope.clear_results();
	  });
	}
      });
    };

    scope.clear_results();
    scope.config_load();

    console.log(JSON.stringify(config));
    console.log(JSON.stringify(transmit));

}]);

