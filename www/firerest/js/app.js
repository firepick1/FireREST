'use strict';

// Declare app level module which depends on filters, and services
angular.module('FireREST', [
  'ngRoute',
  'FireREST.bootstrap',
//  'FireREST.filters',
  'FireREST.services',
//  'FireREST.directives',
  'FireREST.controllers'
]).
config(['$routeProvider', function($routeProvider) {
//  $routeProvider.when('/status', {templateUrl: 'partials/status.html', controller: 'StatusCtrl'});
//  $routeProvider.when('/spindle', {templateUrl: 'partials/spindle.html', controller: 'SpindleCtrl'});
//  $routeProvider.when('/camera', {templateUrl: 'partials/camera.html', controller: 'CameraCtrl'});
//  $routeProvider.when('/move', {templateUrl: 'partials/move.html', controller: 'MoveCtrl'});
//  $routeProvider.when('/configure', {templateUrl: 'partials/configure.html', controller: 'ConfigureCtrl'});
//  $routeProvider.otherwise({redirectTo: '/status'});
}]);
