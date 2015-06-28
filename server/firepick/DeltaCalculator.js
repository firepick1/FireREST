var should = require("should"),
    module = module || {},
    firepick = firepick || {};
Logger = require("./Logger");

(function(firepick) {
	var logger = new Logger();
    var sqrt3 = Math.sqrt(3.0);
    var pi = Math.PI;
    var sin120 = sqrt3 / 2.0;
    var cos120 = -0.5;
    var tan60 = sqrt3;
    var sin30 = 0.5;
    var tan30 = 1 / sqrt3;
    var tan30_half = tan30 / 2.0;
    var dtr = pi / 180.0;

    function DeltaCalculator(options) {
		var that = this;
        options = options || {};
        that.e = options.e || 131.636; // effector equilateral triangle side
        that.f = options.f || 190.526; // base equilateral triangle side
        that.re = options.re || 270.000; // effector arm length
        that.rf = options.rf || 90.000; // base arm length
		that.steps360 = options.steps360 == null ? 400 : options.steps360;
		that.microsteps = options.microsteps == null ? 16 : options.microsteps;
		that.gearRatio = options.gearRatio == null ? 150/16 : options.gearRatio;
		that.degreePulses = options.degreePulses == null ?
			that.steps360 * that.microsteps * that.gearRatio / 360 :
			options.degreePulses;
		if (options.homePulses) {
			options.homePulses.p1.should.be.Number;
			options.homePulses.p2.should.be.Number;
			options.homePulses.p3.should.be.Number;
			that.homePulses = options.homePulses;
			that.homeAngles = {
				theta1:that.homePulses.p1/that.degreePulses,
				theta2:that.homePulses.p2/that.degreePulses,
				theta3:that.homePulses.p3/that.degreePulses,
			};
		} else {
			that.homeAngles = options.homeAngles || {theta1:-67.2, theta2:-67.2, theta3:-67.2};
			that.homeAngles.theta1.should.be.Number;
			that.homeAngles.theta2.should.be.Number;
			that.homeAngles.theta3.should.be.Number;
			that.homePulses = options.homePulses || {
				p1:that.homeAngles.theta1*that.degreePulses,
				p2:that.homeAngles.theta2*that.degreePulses,
				p3:that.homeAngles.theta3*that.degreePulses,
			};
		}
		that.dz = 0;
		that.eTheta1 = 0;
		that.eTheta2 = 0;
		that.eTheta3 = 0;
		var xyz = that.calcXYZ({
                    theta1: 0,
                    theta2: 0,
                    theta3: 0,
                });
        that.dz = options.dz || -xyz.z;
		logger.trace("dz:",xyz);

		that.eTheta1 = options.eTheta1 == null ? 0 : options.eTheta1;
		that.eTheta2 = options.eTheta2 == null ? 0 : options.eTheta2;
		that.eTheta3 = options.eTheta3 == null ? 0 : options.eTheta3;
		that.eTheta1.should.be.Number;
		that.eTheta2.should.be.Number;
		that.eTheta3.should.be.Number;

        return that;
    };
    DeltaCalculator.prototype.calcXYZ = function(angles) {
		var that = this;
		if (angles.theta1 == null && angles.p1 != null) {
			angles.p1.should.be.Number;
			angles.p2.should.be.Number;
			angles.p3.should.be.Number;
			return that.calcXYZ({
				theta1:angles.p1/that.degreePulses,
				theta2:angles.p2/that.degreePulses,
				theta3:angles.p3/that.degreePulses,
			});
		}
        angles.theta1.should.be.Number;
        angles.theta2.should.be.Number;
        angles.theta3.should.be.Number;

        var t = (that.f - that.e) * tan30 / 2;
        var theta1 = (angles.theta1 - that.eTheta1) * dtr;
        var theta2 = (angles.theta2 - that.eTheta2) * dtr;
        var theta3 = (angles.theta3 - that.eTheta3) * dtr;
        var y1 = -(t + that.rf * Math.cos(theta1));
        var z1 = -that.rf * Math.sin(theta1);
        var y2 = (t + that.rf * Math.cos(theta2)) * sin30;
        var x2 = y2 * tan60;
        var z2 = -that.rf * Math.sin(theta2);
        var y3 = (t + that.rf * Math.cos(theta3)) * sin30;
        var x3 = -y3 * tan60;
        var z3 = -that.rf * Math.sin(theta3);
        var dnm = (y2 - y1) * x3 - (y3 - y1) * x2;
        var w1 = y1 * y1 + z1 * z1;
        var w2 = x2 * x2 + y2 * y2 + z2 * z2;
        var w3 = x3 * x3 + y3 * y3 + z3 * z3;
        // x = (a1*z + b1)/dnm
        var a1 = (z2 - z1) * (y3 - y1) - (z3 - z1) * (y2 - y1);
        var b1 = -((w2 - w1) * (y3 - y1) - (w3 - w1) * (y2 - y1)) / 2.0;
        // y = (a2*z + b2)/dnm
        var a2 = -(z2 - z1) * x3 + (z3 - z1) * x2;
        var b2 = ((w2 - w1) * x3 - (w3 - w1) * x2) / 2.0;
        // a*z^2 + b*z + c = 0
        var a = a1 * a1 + a2 * a2 + dnm * dnm;
        var b = 2.0 * (a1 * b1 + a2 * (b2 - y1 * dnm) - z1 * dnm * dnm);
        var c = (b2 - y1 * dnm) * (b2 - y1 * dnm) + b1 * b1 + dnm * dnm * (z1 * z1 - that.re * that.re);
        // discriminant
        var d = b * b - 4.0 * a * c;
        if (d < 0) { // point exists
			logger.error("DeltaCalculator calcXYZ(", angles, ") point exists");
            return null;
        }
        var z = -0.5 * (b + Math.sqrt(d)) / a;
        return {
            x: (a1 * z + b1) / dnm,
            y: (a2 * z + b2) / dnm,
            z: z + that.dz,
        }
    };
    DeltaCalculator.prototype.calcAngleYZ = function(X, Y, Z) {
		var that = this;
        var y1 = -tan30_half * that.f; // f/2 * tg 30
        Y -= tan30_half * that.e; // shift center to edge
        // z = a + b*y
        var a = (X * X + Y * Y + Z * Z + that.rf * that.rf - that.re * that.re - y1 * y1) / (2.0 * Z);
        var b = (y1 - Y) / Z;
        // discriminant
        var d = -(a + b * y1) * (a + b * y1) + that.rf * (b * b * that.rf + that.rf);
        if (d < 0) {
			logger.error("DeltaCalculator calcAngleYZ(", X, ",", Y, ",", Z, ") discriminant");
            return null;
        }
        var yj = (y1 - a * b - Math.sqrt(d)) / (b * b + 1.0); // choosing outer point
        var zj = a + b * yj;
        return 180.0 * Math.atan(-zj / (y1 - yj)) / pi + ((yj > y1) ? 180.0 : 0.0);
    };
    DeltaCalculator.prototype.calcPulses = function(xyz) {
		var that = this;
		var angles = that.calcAngles(xyz);
		if (angles == null) { // no solution
			return null;
		}
		return {
			p1: Math.round(angles.theta1*that.degreePulses ),
			p2: Math.round(angles.theta2*that.degreePulses ),
			p3: Math.round(angles.theta3*that.degreePulses ),
		}
	}
    DeltaCalculator.prototype.calcAngles = function(xyz) {
		var that = this;
        var x = xyz.x;
        var y = xyz.y;
        var z = xyz.z - that.dz;
        x.should.be.Number;
        y.should.be.Number;
        z.should.be.Number;
        var theta1 = that.calcAngleYZ(x, y, z);
        if (theta1 == null) {
			logger.error("calcAngles(", xyz, ") theta1 is null");
            return null;
        }
        var theta2 = that.calcAngleYZ(x * cos120 + y * sin120, y * cos120 - x * sin120, z);
        if (theta2 == null) {
			logger.error("calcAngles(", xyz, ") theta2 is null");
            return null;
        }
        var theta3 = that.calcAngleYZ(x * cos120 - y * sin120, y * cos120 + x * sin120, z);
        if (theta3 == null) {
			logger.error("calcAngles(", xyz, ") theta3 is null");
            return null;
        }
        return {
            theta1: theta1+that.eTheta1,
            theta2: theta2+that.eTheta2,
            theta3: theta3+that.eTheta3,
        }
    };

	///////////// CLASS ////////////
	DeltaCalculator.setLogger = function(value) {
		should(value.info)
		logger = value;
	}
	DeltaCalculator.getLogger = function() {
		return logger || new Logger();
	}

    logger.info("loaded firepick.DeltaCalculator");
    module.exports = firepick.DeltaCalculator = DeltaCalculator;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.DeltaCalculator", function() {
	DeltaCalculator = firepick.DeltaCalculator;
	var epsilon = 0.0000001;
	function shouldEqualT(a,b,tolerance) {
		tolerance = tolerance || 0.001;
		for (var k in a) {
			var msg = "shouldEqualT({" + k + ":" + a[k] 
				+ "}, {" + k + ":" + b[k] + "} FAIL";
			a[k].should.within(b[k]-tolerance, b[k]+tolerance, msg);
		}
	}
	it("has home angle option", function() {
		shouldEqualT(new DeltaCalculator().homeAngles, {theta1:-67.2,theta2:-67.2,theta3:-67.2});
		shouldEqualT(
			new DeltaCalculator({homeAngles:{theta1:-67,theta2:-67,theta3:-67}}).homeAngles,
			{theta1:-67,theta2:-67,theta3:-67}
		);
	});
	it("has home pulses option that overrides home angle option", function() {
		shouldEqualT(new DeltaCalculator().homePulses, {p1:-11200,p2:-11200,p3:-11200});
		shouldEqualT(
			new DeltaCalculator({homeAngles:{theta1:-67,theta2:-67,theta3:-67}}).homePulses,
			{p1:-11166.667,p2:-11166.667,p3:-11166.667}
		);
		shouldEqualT(
			new DeltaCalculator({
				homePulses:{p1:-11166.667,p2:-11166.667,p3:-11166.667},
				}).homeAngles,
			{theta1:-67,theta2:-67,theta3:-67}
		);
	});
	it("has effector equilateral triangle side length option", function() {
		new DeltaCalculator().e.should.equal(131.636);
		new DeltaCalculator({e:120}).e.should.equal(120);
	});
	it("has upper base equilateral triangle side length option", function() {
		new DeltaCalculator().f.should.equal(190.526);
		new DeltaCalculator({f:120}).f.should.equal(120);
	});
	it("has effector arm length option", function() {
		new DeltaCalculator().re.should.equal(270.000);
		new DeltaCalculator({re:230}).re.should.equal(230);
	});
	it("has effector arm length option", function() {
		new DeltaCalculator().rf.should.equal(90.000);
		new DeltaCalculator({rf:114}).rf.should.equal(114);
	});
	it("has steps per revolution option", function() {
		new DeltaCalculator().steps360.should.equal(400);
		new DeltaCalculator({steps360:200}).steps360.should.equal(200);
	});
	it("has microsteps option", function() {
		new DeltaCalculator().microsteps.should.equal(16);
		new DeltaCalculator({microsteps:8}).microsteps.should.equal(8);
	});
	it("has pulley gear ratio option", function() {
		new DeltaCalculator().gearRatio.should.equal(150/16);
		new DeltaCalculator({gearRatio:100/16}).gearRatio.should.equal(100/16);
	});
	it("has degreePulses option", function() {
		new DeltaCalculator().degreePulses.should.equal(500/3);
		new DeltaCalculator({degreePulses:100}).degreePulses.should.equal(100);
	});
	it("has home origin offset option", function() {
		new DeltaCalculator().dz.should.within(247.893,247.894);
		new DeltaCalculator({dz:100}).dz.should.equal(100);
	});
	it("has homing error options", function() {
		new DeltaCalculator().eTheta1.should.equal(0);
		new DeltaCalculator({eTheta1:3.1}).eTheta1.should.equal(3.1);
		new DeltaCalculator().eTheta2.should.equal(0);
		new DeltaCalculator({eTheta2:3.1}).eTheta2.should.equal(3.1);
		new DeltaCalculator().eTheta3.should.equal(0);
		new DeltaCalculator({eTheta3:3.1}).eTheta3.should.equal(3.1);
	});
	it("calcXYZ() should compute XYZ from angles ", function() {
        var dc = new DeltaCalculator();
		shouldEqualT(dc.calcXYZ({theta1:0, theta2:0, theta3:0}), {x:0,y:0,z:0});
	});
	it("angles increase downwards as Z decreases", function() {
        var dc = new DeltaCalculator();
		shouldEqualT(dc.calcXYZ({theta1:1, theta2:1, theta3:1}), {x:0,y:0,z:-1.5766});
	});
	it("calcAngles() should compute angles from XYZ", function() {
        var dc = new DeltaCalculator();
		shouldEqualT(dc.calcAngles({x:0,y:0,z:0}), {theta1:0, theta2:0, theta3:0});
		shouldEqualT(dc.calcAngles({x:0,y:0,z:-1.5766}), {theta1:1, theta2:1, theta3:1});
	});
	it("xyz(0,0,0) should be at theta(0,0,0)", function() {
        var dc = new firepick.DeltaCalculator();
		shouldEqualT(dc.calcXYZ({theta1:0, theta2:0, theta3:0}), {x:0,y:0,z:0});
		shouldEqualT(dc.calcAngles({x:0,y:0,z:0}), {theta1:0, theta2:0, theta3:0});
	});
	it("calcPulses() should compute stepper pulse coordinate from XYZ ", function() {
        var dc = new DeltaCalculator();
		shouldEqualT(dc.calcPulses({x:0, y:0, z:0}), {p1:0,p2:0,p3:0});
		shouldEqualT(dc.calcPulses(dc.calcXYZ(dc.homeAngles)), dc.homePulses);
		shouldEqualT(dc.calcPulses({x:1, y:2, z:3}), {p1:-227,p2:-406,p3:-326});
		shouldEqualT(dc.calcPulses({x:1, y:2, z:-3}), {p1:407,p2:233,p3:311});
		shouldEqualT(dc.calcPulses({x:1, y:2, z:-90}), {p1:9658,p2:9521,p3:9582});
	});
	it("calcXYZ() should compute XYZ from stepper pulse coordinates", function() {
        var dc = new DeltaCalculator();
		shouldEqualT(dc.calcXYZ({p1:0, p2:0, p3:0}), {x:0,y:0,z:0});
		shouldEqualT(dc.calcXYZ({p1:-227, p2:-406, p3:-326}), {x:1,y:2,z:3}, 0.007);
		shouldEqualT(dc.calcXYZ({p1:407, p2:233, p3:311}), {x:1,y:2,z:-3}, 0.007);
		shouldEqualT(dc.calcXYZ({p1:9658, p2:9521, p3:9582}), {x:1,y:2,z:-90}, 0.009);
	});
	it("should generate thetaerr.csv", function() {
        var dc = new firepick.DeltaCalculator();
		function testData(xyz) {
			var v = [];
			for (var dtheta=-2; dtheta<=2; dtheta++) {
				var angles = dc.calcAngles(xyz);
				var theta_dtheta = {
					theta1:angles.theta1+dtheta, 
					theta2:angles.theta2+dtheta, 
					theta3:angles.theta3+dtheta
					};
				var xyz_dtheta = dc.calcXYZ(theta_dtheta);
				v.push(xyz_dtheta.x - xyz.x);
				v.push(xyz_dtheta.y - xyz.y);
				v.push(xyz_dtheta.z - xyz.z);
			}
			logger.info(",", xyz.x, 
				", ", v[0], ", ", v[1], ", ", v[2], ", ", v[3], ", ", v[4],
				", ", v[5], ", ", v[6], ", ", v[7], ", ", v[8], ", ", v[9],
				", ", v[10], ", ", v[11], ", ", v[12], ", ", v[13], ", ", v[14]);
		}
		var line = ", x";
		for (var dtheta=-2; dtheta<=2; dtheta++) {
			line += ", xErr(" + dtheta + ")" +
				", yErr(" + dtheta + ")" +
				", zErr(" + dtheta + ")";
		}
		logger.info(line);
		for (var i=-10; i<=10; i++) {
			testData({x:i*10,y:0,z:-70});
		}
	});
	it("should generate gearerror.csv", function() {
		var dc = [
			new DeltaCalculator({gearRatio:149/16}), // smaller
			new DeltaCalculator({gearRatio:150/16}), // normal
			new DeltaCalculator({gearRatio:151/16}), // larger
		];
		function testData(xyz) {
			var v = [];
			for (var i=0; i<3; i++) {
				var angles = dc[1].calcAngles(xyz);
				var xyz_gear = dc[i].calcXYZ(angles);
				v.push(xyz_gear.x - xyz.x);
				v.push(xyz_gear.y - xyz.y);
				v.push(xyz_gear.z - xyz.z);
			}
			logger.info(",", xyz.x, 
				", ", v[0], ", ", v[1], ", ", v[2], ", ", v[3], ", ", v[4],
				", ", v[5], ", ", v[6], ", ", v[7], ", ", v[8]);
		}
		var line = ", x";
		for (var dtheta=-2; dtheta<=2; dtheta++) {
			line += ", xErr(" + dtheta + ")" +
				", yErr(" + dtheta + ")" +
				", zErr(" + dtheta + ")";
		}
		logger.info(line);
		for (var i=-10; i<=10; i++) {
			testData({x:i*10,y:0,z:-70});
		}
	});
	it("homing error should affect Y and Z", function() {
		var dc = new DeltaCalculator();
		var angles = [
			dc.calcAngles({x:-100,y:0,z:-70}),
			dc.calcAngles({x:0,y:0,z:-70}),
			dc.calcAngles({x:100,y:0,z:-70})
		];
		var dc_minus1 = new DeltaCalculator({eTheta1:-1,eTheta2:-1,eTheta3:-1});
		var dc_plus1 = new DeltaCalculator({eTheta1:1,eTheta2:1,eTheta3:1});

		shouldEqualT(dc_plus1.calcXYZ(angles[0]),{x:-99.947,y:0.213,z:-68.745});
		shouldEqualT(dc_plus1.calcXYZ(angles[1]),{x:0,y:0,z:-68.492});
		shouldEqualT(dc_plus1.calcXYZ(angles[2]),{x:99.947,y:0.213,z:-68.745});

		shouldEqualT(dc_minus1.calcXYZ(angles[0]),{x:-100.025,y:-0.218,z:-71.238});
		shouldEqualT(dc_minus1.calcXYZ(angles[1]),{x:0,y:0,z:-71.491});
		shouldEqualT(dc_minus1.calcXYZ(angles[2]),{x:100.025,y:-0.218,z:-71.238});
	});
	it("homing error affects perspective", function() {
		var dc = new DeltaCalculator();
		for (var z=0; z>=-100; z-=10) {
			var row = [];
			var angles = dc.calcAngles({x:0,y:0,z:z});
			for (var a=-5; a<=5; a++) {
				var xyz = dc.calcXYZ({
					theta1:angles.theta1+a,
					theta2:angles.theta2+a,
					theta3:angles.theta3+a,
					});
				row.push(xyz.z);
			}
			logger.info(z,row);
		}
	});
	it("eTheta1..3 should compensate for homing error", function() {
		var dc0 = new DeltaCalculator({eTheta1:0, eTheta2:0, eTheta3:0});
		var angles_x100 = {theta1:42.859, theta2:21.470, theta3:60.082};
		var xyz = {x:100,y:0,z:-50};
		shouldEqualT(dc0.calcAngles(xyz), angles_x100);
		var dc1 = new DeltaCalculator({eTheta1:1, eTheta2:1, eTheta3:1});
		dc1.eTheta1.should.equal(1);
		dc1.dz.should.equal(dc0.dz);
		shouldEqualT(dc1.calcAngles(xyz), {
			theta1:angles_x100.theta1 + 1,
			theta2:angles_x100.theta2 + 1,
			theta3:angles_x100.theta3 + 1,
		});
		shouldEqualT(dc1.calcXYZ(dc1.calcAngles(xyz)), xyz);
	});
});
/*
#define DELTA_E         131.636 // End effector length
#define DELTA_F         190.526 // Base length
#define DELTA_RE        270.000 // Carbon rod length
#define DELTA_RF         90.000 // Servo horn length
//#define DELTA_Z_OFFSET  293.000 // Distance from delta 8mm rod/pulley to table/bed.

//NOTE: For OpenPnP, set the zero to be about 25mm above the bed...
#define DELTA_Z_OFFSET  268.000 // Distance from delta 8mm rod/pulley to table/bed.


#define DELTA_EE_OFFS    15.000 // Ball joint plane to bottom of end effector surface
//#define TOOL_OFFSET       0.000 // No offset
//#define TOOL_OFFSET      40.000 // Distance between end effector ball joint plane and tip of tool (Z probe)
#define TOOL_OFFSET      30.500 // Distance between end effector ball joint plane and tip of tool (PnP)
#define Z_CALC_OFFSET  ((DELTA_Z_OFFSET - TOOL_OFFSET - DELTA_EE_OFFS) * -1.0)

#define Z_HOME_ANGLE    -67.200 // This is the angle where the arms hit the endstop sensor
#define Z_HOME_OFFS    (((DELTA_Z_OFFSET - TOOL_OFFSET - DELTA_EE_OFFS) - 182.002) - 0.5)
                                // This is calculated from the above angle, after applying forward 
                                // kinematics, and adding the Z calc offset to it.

*/
