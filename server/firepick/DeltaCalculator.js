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
        that.e = options.e || 115; // effector equilateral triangle side
        that.f = options.f || 457.3; // base equilateral triangle side
        that.re = options.re || 232; // effector arm length
        that.rf = options.rf || 112; // base arm length
		that.steps360 = options.steps360 == null ? 400 : options.steps360;
		that.microsteps = options.microsteps == null ? 16 : options.microsteps;
		that.gearRatio = options.gearRatio == null ? 150/16 : options.gearRatio;
		that.degreePulses = options.degreePulses == null ?
			that.steps360 * that.microsteps * that.gearRatio / 360 :
			options.degreePulses;
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
            z: z + that.dz,
            x: (a1 * z + b1) / dnm,
            y: (a2 * z + b2) / dnm
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
			p1: angles.theta1*that.degreePulses,
			p2: angles.theta2*that.degreePulses,
			p3: angles.theta3*that.degreePulses,
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
	it("has effector equilateral triangle side length option", function() {
		new DeltaCalculator().e.should.equal(115);
		new DeltaCalculator({e:120}).e.should.equal(120);
	});
	it("has upper base equilateral triangle side length option", function() {
		new DeltaCalculator().f.should.equal(457.3);
		new DeltaCalculator({f:120}).f.should.equal(120);
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
	it("has effector arm length option", function() {
		new DeltaCalculator().re.should.equal(232);
		new DeltaCalculator({re:230}).re.should.equal(230);
	});
	it("has effector arm length option", function() {
		new DeltaCalculator().rf.should.equal(112);
		new DeltaCalculator({rf:114}).rf.should.equal(114);
	});
	it("TESTTESThas home origin offset option", function() {
		new DeltaCalculator().dz.should.within(96.859,96.860);
		new DeltaCalculator({dz:100}).dz.should.equal(100);
	});
	it("TESTTESThas homing error options", function() {
		new DeltaCalculator().eTheta1.should.equal(0);
		new DeltaCalculator({eTheta1:3.1}).eTheta1.should.equal(3.1);
		new DeltaCalculator().eTheta2.should.equal(0);
		new DeltaCalculator({eTheta2:3.1}).eTheta2.should.equal(3.1);
		new DeltaCalculator().eTheta3.should.equal(0);
		new DeltaCalculator({eTheta3:3.1}).eTheta3.should.equal(3.1);
	});
	it("TESTTESTcalcXYZ() should compute XYZ from angles ", function() {
        var dc = new DeltaCalculator();
		shouldEqualT(dc.calcXYZ({theta1:0, theta2:0, theta3:0}), {x:0,y:0,z:0});
	});
	it("TESTTESTangles increase downwards as Z decreases", function() {
        var dc = new DeltaCalculator();
		shouldEqualT(dc.calcXYZ({theta1:1, theta2:1, theta3:1}), {x:0,y:0,z:-1.992});
	});
	it("TESTTESTcalcAngles() should compute angles from XYZ", function() {
        var dc = new DeltaCalculator();
		shouldEqualT(dc.calcAngles({x:0,y:0,z:0}), {theta1:0, theta2:0, theta3:0});
		shouldEqualT(dc.calcAngles({x:0,y:0,z:-1.992}), {theta1:1, theta2:1, theta3:1});
	});
	it("xyz(0,0,0) should be at theta(0,0,0)", function() {
        var dc = new firepick.DeltaCalculator();
		shouldEqualT(dc.calcXYZ({theta1:0, theta2:0, theta3:0}), {x:0,y:0,z:0});
		shouldEqualT(dc.calcAngles({x:0,y:0,z:0}), {theta1:0, theta2:0, theta3:0});
	});
	it("TESTTESTlines in XYZ space map to curves in delta space", function() {
        var dc = new firepick.DeltaCalculator();
		var epsilon = 0.0000000000001;
		var expected = [
			{theta1:19.403,theta2:19.403,theta3:19.403},
			{theta1:19.553,theta2:14.119,theta3:24.683},
			{theta1:20.000,theta2: 8.858,theta3:29.938},
			{theta1:20.743,theta2: 3.657,theta3:35.155},
			{theta1:21.780,theta2:-1.436,theta3:40.325},
			{theta1:23.107,theta2:-6.366,theta3:45.448},
			{theta1:24.721,theta2:-11.073,theta3:50.524},
			{theta1:26.619,theta2:-15.488,theta3:55.559},
			{theta1:28.800,theta2:-19.547,theta3:60.563},
			{theta1:31.263,theta2:-23.191,theta3:65.546},
			{theta1:34.009,theta2:-26.372,theta3:70.524},
		];

		function testCalc(xyz,expectedAngles,dtheta) {
			var angles = dc.calcAngles(xyz);
			logger.debug("angles:", angles);
			var theta_dtheta = {
				theta1:angles.theta1+dtheta, 
				theta2:angles.theta2+dtheta, 
				theta3:angles.theta3+dtheta
				};
			var xyz_dtheta = dc.calcXYZ(theta_dtheta);
			if (dtheta === 0) { // round trip
				shouldEqualT(angles, expectedAngles);
			} else {
				logger.debug("dtheta:", dtheta, "error",
					" x:", xyz_dtheta.x-xyz.x,
					" y:", xyz_dtheta.y-xyz.y,
					" z:", xyz_dtheta.z-xyz.z);
			}
		}
		testCalc({x:  0,y:0,z:-50}, expected[ 0], 0);
		testCalc({x: 10,y:0,z:-50}, expected[ 1], 0);
		testCalc({x: 20,y:0,z:-50}, expected[ 2], 0);
		testCalc({x: 30,y:0,z:-50}, expected[ 3], 0);
		testCalc({x: 40,y:0,z:-50}, expected[ 4], 0);
		testCalc({x: 50,y:0,z:-50}, expected[ 5], 0);
		testCalc({x: 60,y:0,z:-50}, expected[ 6], 0);
		testCalc({x: 70,y:0,z:-50}, expected[ 7], 0);
		testCalc({x: 80,y:0,z:-50}, expected[ 8], 0);
		testCalc({x: 90,y:0,z:-50}, expected[ 9], 0);
		testCalc({x:100,y:0,z:-50}, expected[10], 0);
		for (var i=0; i<=10; i++) {
			testCalc({x:i*10,y:0,z:-50}, expected[i], -2);
		}
		for (var i=0; i<=10; i++) {
			testCalc({x:i*10,y:0,z:-50}, expected[i], -1);
		}
		for (var i=0; i<=10; i++) {
			testCalc({x:i*10,y:0,z:-50}, expected[i], 1);
		}
		for (var i=0; i<=10; i++) {
			testCalc({x:i*10,y:0,z:-50}, expected[i], 2);
		}
	});
	it("TESTTESTshould compensate for homing error", function() {
		var dc0 = new DeltaCalculator({eTheta1:0, eTheta2:0, eTheta3:0});
		var angles_x100 = {theta1:34.009, theta2:-26.372, theta3:70.524};
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
	});
});
