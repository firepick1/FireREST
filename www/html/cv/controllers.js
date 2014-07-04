'use strict';
var bootstrap = angular.module('FireREST.bootstrap', ['ui.bootstrap']);

var controllers = angular.module('FireREST.controllers', []);

controllers.controller('MainCtrl', 
  ['$scope','$location', 'BackgroundThread', 'ServiceConfig', 'AjaxAdapter', 'CvService',
  function(scope, location, bg, service, transmit, cv) {
    transmit.clear();
    scope.transmit = transmit;
    scope.service = service;
    scope.config = {};
    scope.cv = cv;

    scope.worker = function(ticks) {
     if ((ticks % 5) === 0 ) {
       cv.resources.indexOf('process.fire') >= 0 && cv.resource_GET('process.fire');
     } else if ((ticks % 3) === 0 ) {
       cv.image_GET('monitor.jpg');
     } else if ((ticks % 3) === 1 ) {
       cv.image_GET('camera.jpg');
     }
     return true;
    }

    cv.clear_results();
    service.load_config(scope).then( function(config) {
      console.log("processing configuration" );
      scope.config = config;
      if (typeof config.cv === 'object') {
	var cv = scope.cv;
	cv.camera_names = Object.keys(config.cv.camera_map); 
	cv.camera_name = cv.camera_names[0];
	cv.image = ['monitor.jpg'];
	cv.profile_names = cv.camera_name && Object.keys(config.cv.camera_map[cv.camera_name].profile_map);
	cv.profile_name = cv.profile_names[0];
	cv.cve_name = cv.cve_names()[0] || "no-CVE";
	cv.clear_results();
	bg.worker = scope.worker;
      }
    }, function(ex) {
      scope.$apply(function(){
	scope.cv.camera_names = ["camera n/a"];
	cv.clear_results();
      });
    }, function(notify) {
      console.log("promise notify " + notify);
    });

}]);

