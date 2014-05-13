'use strict';
var bootstrap = angular.module('FireREST.bootstrap', ['ui.bootstrap']);

var controllers = angular.module('FireREST.controllers', []);

controllers.controller('MainCtrl', ['$scope','$location',
  function(scope, location) {
    scope.demo = "";
    scope.server = "localhost";
    scope.port = 8001;
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

    scope.check_demo = function() {
      scope.demo = "...";
      $.ajax({
	url: scope.service_url() + "/demo.txt",
	data: { r: Math.random() },
	success: function( data ) {
	  scope.$apply(function(){
	    scope.demo = (data || "").trim();
	  });
	}
      });
    };
    scope.clear_results = function() {
      scope.action_response = {};
      scope.action_classname = {};
      scope.check_demo();
    };
    scope.clear_results();

    scope.imageInstances = {};
    scope.imageLarge = {};
    scope.image_url = function(image) {
      var t = scope.imageInstances[image] || 0;
      return scope.camera_url() + image + "?t=" + t;
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
      scope.imageInstances[image] = Math.random();
    };
    
    scope.action_text = function(action) {
      return scope.action_response[action] || "...";
    }
    scope.action_url = function(action) {
      return scope.camera_url() + scope.profile + "/cve/" + scope.cve + "/" + action + ".json";
    };
    scope.action_class = function(action) {
      return scope.action_classname[action] || "fr-json-ok";
    };
    scope.action_GET = function(action) {
	scope.action_response[action] = "...";
	$.ajax({
	  url: scope.action_url(action),
	  data: { r: Math.random() },
	  success: function( data ) {
	    scope.$apply(function(){
	      scope.action_response[action] = JSON.stringify(data);
	      scope.action_classname[action] = "fr-json-ok";
	    });
	  },
	  error: function( jqXHR, ex) {
	    scope.$apply(function(){
	      scope.action_classname[action] = "fr-json-err";
	      scope.action_response[action] = JSON.stringify(jqXHR);
	    });
	  }
	});
      }
}]);
