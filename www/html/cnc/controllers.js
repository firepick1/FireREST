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

    var cnc = {
      resources:['gcode.fire'],
      dce_names:["(no DCE's)"],
      dce_list:{},
      dce:{
	axes:[
	  {id:'(none)', value:0, jog:1, resolution:0.001, min:0, max:1, steps:1, units:"mm", enabled:false},
	]
      },
      axis_class: function(axis) {
        var result = axis.enabled ? "" : "fr-axis-disabled ";
        if (typeof axis.min === "number" && axis.value < axis.min) {
	  result = "fr-axis-error-min";
	} else if (typeof axis.max === "number" && axis.max < axis.value) {
	  result += "fr-axis-error-max";
	}
	return result;
      },
      jog: function(axis, value) {
        axis.value = Number(axis.value) + Number(value);
	if (axis.resolution < 1) {
	  var divisor = Math.round(1/axis.resolution);
	  axis.value = Math.round(axis.value/axis.resolution)*1.0/divisor;
	}
      },
      resource_text: function(resource) {
	  return cnc.resource_response[resource] || " ";
      },
      resource_path: function(resource) {
	return "/cnc/" + cnc.dce_name + "/" + resource ;
      },
      resource_url: function(resource) {
	return service.service_url() + "/cnc/" + cnc.dce_name + "/" + resource ;
      },
      resource_class: function(resource) {
	return cnc.resource_classname[resource] || "fr-json-ok";
      },
      resource_XHR: function(resource, classname, response, ok) {
	service.scope.$apply(function(){
	  console.log('resource_XHR' + resource + response);
	  cnc.resource_response[resource] = response;
	  cnc.resource_classname[resource] = classname;
	  transmit.end(true);
	});
      },
      clear_results: function() {
	cnc.resource_response = {};
	cnc.resource_classname = {};
        cnc.dce_names = [];
	cnc.dce_list = {};
      },
      resource_GET_icon: function(action) {
	return transmit.autoRefresh && (action === "gcode.fire") ? "glyphicon glyphicon-repeat" : "";
      },
      resource_GET: function(resource) {
	console.log("GET " + resource);
	transmit.start();
	$.ajax({
	  url: cnc.resource_url(resource), data: { r: Math.floor(Math.random()*1000000) },
	  success: function( data ) {
	    if (typeof data === 'object') {
	      data = JSON.stringify(data);
	    }
	    data = ("" + data).trim();
	    cnc.resource_XHR(resource, "fr-json-ok", data, true);
	  },
	  error: function( jqXHR, ex) {
	    cnc.resource_XHR(resource, "fr-json-err", JSON.stringify(jqXHR), false);
	  }
	});
      },
      resource_armed_class: function(armed) {
        return cnc.armed === armed ? "btn-warning" : "btn-primary";
      },
      resource_POST: function(resource, armed) {
	if (cnc.armed === armed) {
	  transmit.start();
	  var data="(no-data)";
	  if (armed === 'move') {
	    data = "G0";
	    cnc.dce.axes.forEach(function(axis) { 
		if (axis.enabled) {
		  data += axis.id;
		  data += axis.value * axis.steps;
		}
	    });
	  }
	  console.log("POST:" + data);
	  $.ajax({
	    type:"POST",
	    url: cnc.resource_url(resource),
	    data: data,
	    success: function() {
	      cnc.resource_XHR(resource, "fr-json-ok", data, true);
	    },
	    error: function( jqXHR, ex) {
	      cnc.resource_XHR(resource, "fr-json-err", JSON.stringify(jqXHR), false);
	    }
	  });
	  cnc.armed = null;
	} else {
	  cnc.armed = armed;
	}
      },
      resource_isPOST: function(resource) {
	return resource === 'gcode.fire';
      }
    };
    scope.cnc = cnc;

    scope.worker = function(ticks) {
     if ((ticks % 5) === 0 ) {
       cnc.resources.indexOf('gcode.fire') >= 0 && cnc.resource_GET('gcode.fire');
     }
     return true;
    }

    cnc.clear_results();
    service.load_config(scope).then( function(config) {
      console.log("processing config.json" );
      scope.config = config;
      if (typeof config.cnc === 'object') {
        cnc.dce_names = [];
	for (var dce_name in config.cnc) {
	  if (config.cnc.hasOwnProperty(dce_name)) {
	    var dce = config.cnc[dce_name];
	    console.log("dce " + dce_name + ":" + JSON.stringify(dce));
	    dce.name = dce_name;
	    cnc.dce_names.push(dce_name);
	    cnc.dce_list[dce_name] = dce;
	    cnc.dce_name = dce_name;
	    cnc.dce = dce;
	    console.log("configured DCE " + dce.name );
	  }
	}
	bg.worker = scope.worker;
      }
    }, function(ex) {
      // no action
    }, function(notify) {
      console.log("promise notify " + notify);
    });

}]);

