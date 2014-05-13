'use strict';
var bootstrap = angular.module('FireREST.bootstrap', ['ui.bootstrap']);

var controllers = angular.module('FireREST.controllers', []);

controllers.controller('MainCtrl', ['$scope','$location',
  function(scope, location) {
    scope.server = "localhost";
    scope.port = 8001;
    scope.service = "/firerest";
    scope.camera = 1;
    scope.profile = "gray";
    scope.cve = "calc-offset";

    scope.imageInstances = {};
    scope.imageLarge = {};

    scope.camera_url = function() {
      return "http://" + scope.server + ":"  + scope.port + scope.service + "/cv/" + scope.camera + "/";
    };

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
    
    scope.action_url = function(action) {
      return scope.camera_url() + scope.profile + "/cve/" + scope.cve + "/" + action + ".json";
    };
    scope.action_GET = function(action) {
	$( "#" + action + "-json" ).html( "..." );
	$.ajax({
	  url: scope.action_url(action),
	  data: { r: Math.random() },
	  success: function( data ) {
	    var text = JSON.stringify(data);
	    $( "#" + action + "-json" ).html( text );
	  },
	  error: function( jqXHR, ex) {
	    console.log("ERROR: " + JSON.stringify(jqXHR) + " EX:" + JSON.stringify(ex));
	  }
	});
      }
}]);
