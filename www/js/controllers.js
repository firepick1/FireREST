'use strict';
var bootstrap = angular.module('FireREST.bootstrap', ['ui.bootstrap']);

var controllers = angular.module('FireREST.controllers', []);

controllers.controller('MainCtrl', ['$scope','$location', 'BackgroundThread',
  function(scope, location, bg) {
    scope.content_source = "";
    scope.server = location.host() || "unknownhost";
    scope.port = location.port() || "unknownport";
    scope.service = "/firerest";
    scope.transmit_enabled = true;
    scope.camera = 1;
    scope.image_update = true;
    scope.resource_update = true;
    scope.transmit = 1; // 0:error, 1:idle, >1:active-network-requests
    scope.profile = "gray";
    scope.cve = "calc-offset";

    scope.transmit_status = function() {
      if (scope.transmit_enabled) {
	switch (scope.transmit) {
	  case 0: return "glyphicon-remove fr-transmit-dead";
	  case 1: return "glyphicon-ok fr-transmit-idle";
	  default: return "glyphicon-ok fr-transmit-active";
	}
      } else {
	switch (scope.transmit) {
	  case 0: return "glyphicon-minus-sign fr-transmit-dead";
	  case 1: return "glyphicon-minus-sign fr-transmit-idle";
	  default: return "glyphicon-minus-sign fr-transmit-active";
	}
      }
    }
    scope.transmit_icon = function() {
      return scope.transmit_enabled ?  "glyphicon-pause" : "glyphicon-play";
    }
    scope.transmit_click = function() {
      scope.transmit_enabled = !scope.transmit_enabled;
    }
    scope.transmit_isIdle = function() { return scope.transmit == 1; }
    scope.transmit_isBusy = function() { return scope.transmit > 1; }
    scope.transmit_isError = function() { return scope.transmit == 0; }
    scope.transmit_start = function() {
      scope.transmit = scope.transmit ? (scope.transmit+1) : 0;
    }
    scope.transmit_end = function(ok) {
      if (ok) {
	scope.transmit = scope.transmit > 1 ? (scope.transmit-1) : 1;
      } else {
        scope.transmit = 0;
      }
    }

    scope.collapse = {"camera":true, "cve":true, "service":true};
    scope.collapse_icon = function(value) {
      return "glyphicon fr-collapse-icon " +
        (scope.collapse[value] ? "glyphicon-wrench" : "glyphicon-wrench");
    }
    scope.collapse_class = function(value) {
      return scope.collapse[value] ? "fr-hide" : "fr-show";
    }
    scope.collapse_toggle = function(value) {
      scope.collapse[value] = !scope.collapse[value];
    }

    scope.service_url = function() {
      var port = scope.port === "" ? "" : (":" + scope.port);
      return "http://" + scope.server + port + scope.service;
    };
    scope.camera_url = function() {
      return scope.service_url() + "/cv/" + scope.camera + "/";
    };

    scope.check_content_source = function() {
      scope.content_source = "...";
      scope.transmit_start();
      $.ajax({
	url: scope.service_url() + "/content_source",
	data: { r: Math.floor(Math.random()*1000000) },
	success: function( data ) {
	  scope.$apply(function(){
	    scope.transmit_end(true);
	    scope.content_source = (data || "").trim();
	  });
	},
	error: function( data ) {
	  scope.$apply(function(){
	    scope.transmit_end(false);
	  });
	}
	  
      });
    };
    scope.clear_results = function() {
      scope.resource_response = {};
      scope.resource_classname = {};
      scope.check_content_source();
    };
    scope.clear_results();

    scope.show_image = ['monitor.jpg'];
    scope.image_instances = {};
    scope.imageLarge = {};
    scope.image_path = function(image) {
      var r = scope.image_instances[image] || 0;
      if (image === 'saved.png') {
	return "/cv/" + scope.camera + "/" + scope.profile + "/cve/" + scope.cve + "/" + image + "?r=" + r;
      } else {
	return "/cv/" + scope.camera + "/" + image + "?r=" + r;
      }
    };
    scope.image_url = function(image) {
      var r = scope.image_instances[image] || 0;
      if (image === 'saved.png') {
	return scope.camera_url() + scope.profile + "/cve/" + scope.cve + "/" + image + "?r=" + r;
      } else {
	return scope.camera_url() + image + "?r=" + r;
      }
    };
    scope.image_class = function(image) {
      var isLarge = scope.imageLarge[image] || false;
      return isLarge ? "fr-img-lg" : "fr-img-sm";
    }
    scope.image_click = function(image) {
      var isLarge = scope.imageLarge[image] || false;
      scope.imageLarge[image] = !isLarge;
    };
    scope.image_GET = function(image) {
      scope.image_instances[image] = Math.floor(Math.random()*1000000) ;
    };
    scope.image_GET_class = function(image) {
      if (scope.image_update && (image === "camera.jpg" || image === "monitor.jpg")) {
	return "btn-default";
      }
      return "btn-primary";
    };
    
    scope.show_resources = ['save'];
    scope.resource_text = function(resource) {
      return scope.resource_response[resource] || "...";
    }
    scope.resource_path = function(resource) {
      return "/cv/" + scope.camera + "/" + scope.profile + "/cve/" + scope.cve + "/" + resource + ".json";
    };
    scope.resource_url = function(resource) {
      return scope.camera_url() + scope.profile + "/cve/" + scope.cve + "/" + resource + ".json";
    };
    scope.resource_class = function(resource) {
      return scope.resource_classname[resource] || "fr-json-ok";
    };
    scope.resource_GET_class = function(resource) {
      if (scope.resource_update && (resource === "process")) {
	return "btn-default";
      }
      return "btn-primary";
    };
    scope.resource_XHR = function(resource, classname, response, ok) {
      scope.$apply(function(){
        console.log('resource_XHR' + resource + response);
	scope.resource_response[resource] = response;
	scope.resource_classname[resource] = classname;
	var t = Math.floor(Math.random()*1000000) ;
	scope.image_instances['camera.jpg'] = t;
	scope.image_instances['monitor.jpg'] = t;
	resource === 'save' && (scope.image_instances['saved.png'] = t);
	resource === 'process' && (scope.image_instances['output.jpg'] = t);
	scope.transmit_end(true);
      });
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
	   scope.resource_update && scope.show_resources.indexOf('process') >= 0 && scope.resource_GET('process');
	 } else if ((ticks % 3) === 0 ) {
	   scope.image_update && scope.image_GET('monitor.jpg');
	 } else if ((ticks % 3) === 1 ) {
	   scope.image_update && scope.image_GET('camera.jpg');
	 }
       }
       return true;
     }
}]);
