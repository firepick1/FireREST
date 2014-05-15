'use strict';
var bootstrap = angular.module('FireREST.bootstrap', ['ui.bootstrap']);

var controllers = angular.module('FireREST.controllers', []);

controllers.controller('MainCtrl', ['$scope','$location', 'BackgroundThread',
  function(scope, location, bg) {
    scope.content_source = "";
    scope.server = location.host() || "unknownhost";
    scope.port = location.port() || "unknownport";
    scope.service = "/firerest";
    scope.camera = 1;
    scope.auto_update = true;
    scope.transmit = 1;
    scope.profile = "gray";
    scope.cve = "calc-offset";

    scope.transmit_class = function() {
      switch (scope.transmit) {
	case 0: return "glyphicon-remove fr-transmit-dead";
        case 1: return "glyphicon-ok fr-transmit-idle";
	default: return "glyphicon-ok fr-transmit-active";
      }
    }
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
        (scope.collapse[value] ? "glyphicon-expand" : "glyphicon-collapse-down");
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
      scope.action_response = {};
      scope.action_classname = {};
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
      if (scope.auto_update && (image === "camera.jpg" || image === "monitor.jpg")) {
	return "btn-default";
      }
      return "btn-primary";
    };
    
    scope.show_actions = ['save'];
    scope.action_text = function(action) {
      return scope.action_response[action] || "...";
    }
    scope.action_path = function(action) {
      return "/cv/" + scope.camera + "/" + scope.profile + "/cve/" + scope.cve + "/" + action + ".json";
    };
    scope.action_url = function(action) {
      return scope.camera_url() + scope.profile + "/cve/" + scope.cve + "/" + action + ".json";
    };
    scope.action_class = function(action) {
      return scope.action_classname[action] || "fr-json-ok";
    };
    scope.action_XHR = function(action, classname, response) {
      scope.$apply(function(){
        console.log('action_XHR' + action + response);
	scope.action_response[action] = response;
	scope.action_classname[action] = classname;
	var t = Math.floor(Math.random()*1000000) ;
	scope.image_instances['camera.jpg'] = t;
	scope.image_instances['monitor.jpg'] = t;
	action === 'save' && (scope.image_instances['saved.png'] = t);
	action === 'process' && (scope.image_instances['output.jpg'] = t);
      });
    }
    scope.action_GET = function(action) {
	scope.action_response[action] = "...";
	scope.transmit_start();
	$.ajax({
	  url: scope.action_url(action),
	  data: { r: Math.floor(Math.random()*1000000) },
	  success: function( data ) {
	    scope.transmit_end(true);
	    scope.action_XHR(action, "fr-json-ok", JSON.stringify(data));
	  },
	  error: function( jqXHR, ex) {
	    scope.transmit_end(false);
	    scope.action_XHR(action, "fr-json-err", JSON.stringify(jqXHR));
	  }
	});
      }
    
     bg.worker = function(ticks) {
       if (scope.transmit && scope.auto_update) {
	 scope.image_GET('monitor.jpg');
	 scope.image_GET('camera.jpg');
       }
       return true;
     }
}]);
