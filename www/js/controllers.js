'use strict';
var bootstrap = angular.module('FireREST.bootstrap', ['ui.bootstrap']);

var controllers = angular.module('FireREST.controllers', []);

controllers.controller('MainCtrl', ['$scope','$location',
  function(scope, location) {
    scope.imageInstances = {};
    scope.imageLarge = {};

    scope.image_url = function(image) {
      var t = scope.imageInstances[image] || 0;
      return "cv/1/" + image + "?t=" + t;
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
    scope.action_GET = function(action) {
	$( "#" + action + "-json" ).html( "..." );
	$.ajax({
	  url: "cv/1/gray/cve/calc-offset/" + action + ".json",
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
