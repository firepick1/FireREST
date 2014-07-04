'use strict';
var bootstrap = angular.module('FireREST.bootstrap', ['ui.bootstrap']);

var controllers = angular.module('FireREST.controllers', []);

controllers.controller('MainCtrl', 
  ['$scope','$location', 'BackgroundThread', 'ServiceConfig', 'AjaxAdapter',
  function(scope, location, bg, service, transmit) {
    transmit.clear();
    scope.transmit = transmit;
    scope.service = service;
    scope.config = {};

    scope.cv = {
      "resources":['save.fire', 'process.fire'],
      "image":[],
      "post_data":{},
      "protocol":"",
      "image_instances":{},
      "image_large":{}
      };

    scope.camera_url = function() {
      return service.service_url() + scope.cv.protocol + "/cv/" + scope.cv.camera_name + "/";
    };

    scope.cve_names = function() {
      var camera = scope.cv.camera_name && scope.config.cv.camera_map[scope.cv.camera_name];
      var profile = camera && camera.profile_map[scope.cv.profile_name];
      return profile && profile.cve_names || [];
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
      return transmit.autoRefresh && (image === "camera.jpg" || image === 'monitor.jpg') ?
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
      return transmit.autoRefresh && (action === "process.fire") ?
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
     if ((ticks % 5) === 0 ) {
       scope.cv.resources.indexOf('process.fire') >= 0 && scope.resource_GET('process.fire');
     } else if ((ticks % 3) === 0 ) {
       scope.image_GET('monitor.jpg');
     } else if ((ticks % 3) === 1 ) {
       scope.image_GET('camera.jpg');
     }
     return true;
    }

    scope.clear_results();
    service.load_config().then( function(config) {
      console.log("processing configuration" );
      scope.config = config;
      if (typeof config.cv === 'object') {
	var cv = scope.cv;
	cv.camera_names = Object.keys(config.cv.camera_map); 
	cv.camera_name = cv.camera_names[0];
	cv.image = ['monitor.jpg'];
	cv.profile_names = cv.camera_name && Object.keys(config.cv.camera_map[cv.camera_name].profile_map);
	cv.profile_name = cv.profile_names[0];
	cv.cve_name = scope.cve_names()[0] || "no-CVE";
	scope.clear_results();
	bg.worker = scope.worker;
      }
    }, function(ex) {
      scope.$apply(function(){
	scope.cv.camera_names = ["camera n/a"];
	scope.clear_results();
      });
    }, function(notify) {
      console.log("promise notify " + notify);
    });

}]);

