'use strict';

var services = angular.module('FireREST.services');

// http://forums.trossenrobotics.com/tutorials/introduction-129/delta-robot-kinematics-3276/
services.factory('DeltaCalculator', ['$http', 
function($http) {
  console.log("Initializing DeltaCalculator");
  var sqrt3 = Math.sqrt(3.0);
  var pi = Math.PI;
  var sin120 = sqrt3/2.0;   
  var cos120 = -0.5;        
  var tan60 = sqrt3;
  var sin30 = 0.5;
  var tan30 = 1/sqrt3;
  var tan30_half = tan30/2.0;
  var dtr = pi/180.0;
  var delta = {
    e: 115.0,     // end effector
    f: 457.3,     // base
    re: 232.0,
    rf: 112.0,
    ok: true,
    X:0,
    Y:0,
    Z:-100,
    theta1:0,
    theta2:0,
    theta3:0,
    orbit_camera:false,
    nicenum: function(value) {
      var factor = 1000.0;
      return Math.round(value * factor)/factor;
    },
    calcForward: function() {
      delta.ok = false;
      var t = (delta.f-delta.e)*tan30/2;
      var theta1 = delta.theta1 * dtr;
      var theta2 = delta.theta2 * dtr;
      var theta3 = delta.theta3 * dtr;
      var y1 = -(t + delta.rf*Math.cos(theta1));
      var z1 = -delta.rf*Math.sin(theta1);
      var y2 = (t + delta.rf*Math.cos(theta2))*sin30;
      var x2 = y2*tan60;
      var z2 = -delta.rf*Math.sin(theta2);
      var y3 = (t + delta.rf*Math.cos(theta3))*sin30;
      var x3 = -y3*tan60;
      var z3 = -delta.rf*Math.sin(theta3);
      var dnm = (y2-y1)*x3-(y3-y1)*x2;
      var w1 = y1*y1 + z1*z1;
      var w2 = x2*x2 + y2*y2 + z2*z2;
      var w3 = x3*x3 + y3*y3 + z3*z3;
      // x = (a1*z + b1)/dnm
      var a1 = (z2-z1)*(y3-y1)-(z3-z1)*(y2-y1);
      var b1 = -((w2-w1)*(y3-y1)-(w3-w1)*(y2-y1))/2.0;
      // y = (a2*z + b2)/dnm
      var a2 = -(z2-z1)*x3+(z3-z1)*x2;
      var b2 = ((w2-w1)*x3 - (w3-w1)*x2)/2.0;
      // a*z^2 + b*z + c = 0
      var a = a1*a1 + a2*a2 + dnm*dnm;
      var b = 2.0*(a1*b1 + a2*(b2-y1*dnm) - z1*dnm*dnm);
      var c = (b2-y1*dnm)*(b2-y1*dnm) + b1*b1 + dnm*dnm*(z1*z1 - delta.re*delta.re);
      // discriminant
      var d = b*b - 4.0*a*c;
      if (d < 0) { // point exists
        delta.ok = false;
      } else {
	delta.Z = delta.nicenum(-0.5*(b+Math.sqrt(d))/a);
	delta.X = delta.nicenum((a1*delta.Z + b1)/dnm);
	delta.Y = delta.nicenum((a2*delta.Z + b2)/dnm);
	delta.ok = true ;
      }
      return delta.ok;
    },
 
    // inverse kinematics
    // helper functions, calculates angle theta1 (for YZ-pane)
    calcAngleYZ: function(X,Y,Z) {
      var y1 = -tan30_half * delta.f; // f/2 * tg 30
      Y -= tan30_half * delta.e;    // shift center to edge
      // z = a + b*y
      var a = (X*X + Y*Y + Z*Z +delta.rf*delta.rf - delta.re*delta.re - y1*y1)/(2.0*Z);
      var b = (y1-Y)/Z;
      // discriminant
      var d = -(a+b*y1)*(a+b*y1)+delta.rf*(b*b*delta.rf+delta.rf); 
      if (d < 0) {
	delta.ok = false;
      } else {
	delta.ok = true;
	var yj = (y1 - a*b - Math.sqrt(d))/(b*b + 1.0); // choosing outer point
	var zj = a + b*yj;
	return 180.0*Math.atan(-zj/(y1 - yj))/pi + ((yj>y1) ? 180.0 : 0.0);
      }
      return -1;
    },
 
    // inverse kinematics: (X, Y, Z) -> (theta1, theta2, theta3)
    // returned status: 0=OK, -1=non-existing position
    calcInverse: function() {
      var theta1 = delta.calcAngleYZ(delta.X, delta.Y, delta.Z);
      var theta2 = delta.theta2;
      var theta3 = delta.theta3;
      if (delta.ok) {
	theta2 = delta.calcAngleYZ(delta.X*cos120 + delta.Y*sin120, delta.Y*cos120-delta.X*sin120, delta.Z);  // rotate coords to +120 deg
      }
      if (delta.ok) {
	theta3 = delta.calcAngleYZ(delta.X*cos120 - delta.Y*sin120, delta.Y*cos120+delta.X*sin120, delta.Z);  // rotate coords to -120 deg
      }
      if (delta.ok) {
	delta.theta1 = theta1;
	delta.theta2 = theta2;
	delta.theta3 = theta3;
      }
      return delta.ok;
    },

    testInverse: function() {
      var X = delta.X;
      var Y = delta.Y;
      var Z = delta.Z;
      delta.calcInverse();
      if (delta.ok) {
	delta.calcForward();
	delta.errX = delta.X-X;
	delta.errY = delta.Y-Y;
	delta.errZ = delta.Z-Z;
	delta.X = X;
	delta.Y = Y;
	delta.Z = Z;
      }
    },
    testForward: function() {
      var theta1 = delta.theta1;
      var theta2 = delta.theta2;
      var theta3 = delta.theta3;
      delta.calcForward();
      if (delta.ok) {
	delta.calcInverse();
	delta.errTheta1 = delta.theta1-theta1;
	delta.errTheta2 = delta.theta2-theta2;
	delta.errTheta3 = delta.theta3-theta3;
	delta.theta1 = theta1;
	delta.theta2 = theta2;
	delta.theta3 = theta3;
      }
    }

  };

  return delta;
}]);
