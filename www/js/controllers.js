'use strict';
var bootstrap = angular.module('FireREST.bootstrap', ['ui.bootstrap']);

var controllers = angular.module('FireREST.controllers', []);

controllers.controller('MainCtrl', ['$scope','$location',
  function(scope, location) {
    scope.content_source = "";
    scope.server = location.host() || "unknownhost";
    scope.port = location.port() || "unknownport";
    scope.service = "/firerest";
    scope.camera = 1;
    scope.profile = "gray";
    scope.cve = "calc-offset";

    scope.service_url = function() {
      return "http://" + scope.server + ":"  + scope.port + scope.service;
    };

    scope.camera_url = function() {
      return scope.service_url() + "/cv/" + scope.camera + "/";
    };

    scope.check_content_source = function() {
      scope.content_source = "...";
      $.ajax({
	url: scope.service_url() + "/content_source",
	data: { r: Math.floor(Math.random()*1000000) },
	success: function( data ) {
	  scope.$apply(function(){
	    scope.content_source = (data || "").trim();
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
    
    scope.show_actions = ['save'];
    scope.action_text = function(action) {
      return scope.action_response[action] || "...";
    }
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
	$.ajax({
	  url: scope.action_url(action),
	  data: { r: Math.floor(Math.random()*1000000) },
	  success: function( data ) {
	    scope.action_XHR(action, "fr-json-ok", JSON.stringify(data));
	  },
	  error: function( jqXHR, ex) {
	    scope.action_XHR(action, "fr-json-err", JSON.stringify(jqXHR));
	  }
	});
      }
}]);
