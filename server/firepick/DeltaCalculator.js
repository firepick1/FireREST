var should = require("should"),
    module = module || {},
    firepick = firepick || {};
Logger = require("./Logger");

(function(firepick) {
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
		that.logger = options.logger || new Logger(options);
        that.e = options.e || 115; // effector equilateral triangle side
        that.f = options.f || 457.3; // base equilateral triangle side
        that.re = options.re || 232; // effector arm length
        that.rf = options.rf || 112; // base arm length
		that.dz = 0;
		var xyz = that.calcXYZ({
                    theta1: 0,
                    theta2: 0,
                    theta3: 0,
                });
        that.dz = options.dz || -xyz.z;
		that.logger.trace("dz:",xyz);
        return that;
    };
    DeltaCalculator.prototype.calcXYZ = function(angles) {
		var that = this;
        angles.theta1.should.be.Number;
        angles.theta2.should.be.Number;
        angles.theta3.should.be.Number;

        var t = (that.f - that.e) * tan30 / 2;
        var theta1 = angles.theta1 * dtr;
        var theta2 = angles.theta2 * dtr;
        var theta3 = angles.theta3 * dtr;
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
            return null;
        }
        var yj = (y1 - a * b - Math.sqrt(d)) / (b * b + 1.0); // choosing outer point
        var zj = a + b * yj;
        return 180.0 * Math.atan(-zj / (y1 - yj)) / pi + ((yj > y1) ? 180.0 : 0.0);
    };
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
            return null;
        }
        var theta2 = that.calcAngleYZ(x * cos120 + y * sin120, y * cos120 - x * sin120, z);
        if (theta2 == null) {
            return null;
        }
        var theta3 = that.calcAngleYZ(x * cos120 - y * sin120, y * cos120 + x * sin120, z);
        if (theta3 == null) {
            return null;
        }
        return {
            theta1: theta1,
            theta2: theta2,
            theta3: theta3
        }
    };

    Logger.logger.info("loaded firepick.DeltaCalculator");
    module.exports = firepick.DeltaCalculator = DeltaCalculator;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.DeltaCalculator", function() {
	DeltaCalculator = firepick.DeltaCalculator;
	var epsilon = 0.0000001;
	function shouldEqualT(a,b,tolerance) {
		tolerance = tolerance || 0.001;
		for (var k in a) {
			var msg = "shouldEqualT({" + k + ":" + a[k] + "}, {" + k + ":" + b[k] + "} FAIL";
			a[k].should.within(b[k]-tolerance, b[k]+tolerance, msg);
		}
	}
	it("should have default options", function() {
        var dcDefault = new DeltaCalculator();
		var dcOptions = new DeltaCalculator({
			e:115,		// OPTION: effector equilateral triangle side
			f:457.3,	// OPTION: base equilateral triangle side
			re:232,		// OPTION: effector arm length
			rf:112,		// OPTION: base arm length
			dz:96.859,	// OPTION: origin offset from highest
		});
		dcDefault.e.should.equal(115);
		dcDefault.f.should.equal(457.3);
		dcDefault.re.should.equal(232);
		dcDefault.rf.should.equal(112);
		dcDefault.dz.should.within(96.859,96.860);
		dcOptions.e.should.equal(115);
		dcOptions.f.should.equal(457.3);
		dcOptions.re.should.equal(232);
		dcOptions.rf.should.equal(112);
		dcOptions.dz.should.within(96.859,96.860);
    });
	it("calcXYZ({theta1:0,theta2:0,theta3:0}) should compute XYZ from angles ", function() {
        var dc = new DeltaCalculator();
		var xyz = dc.calcXYZ({
			theta1: 0,
			theta2: 0,
			theta3: 0
		});
		should.exist(xyz);
		xyz.x.should.within(0-epsilon, 0+epsilon);
		xyz.y.should.within(0-epsilon, 0+epsilon);
		xyz.z.should.within(0-epsilon, 0+epsilon);
	});
	it("calcAngles({x:0,y:0,z:0}) should compute angles from XYZ", function() {
        var dc = new DeltaCalculator();
		var angles = dc.calcAngles({
			x: 0,
			y: 0,
			z: 0
		});
		should.exist(angles);
		should(angles.theta1).within(0-epsilon, 0+epsilon);
		should(angles.theta2).within(0-epsilon, 0+epsilon);
		should(angles.theta3).within(0-epsilon, 0+epsilon);
	});
	it("xyz(0,0,0) should be at theta(0,0,0)", function() {
        var dc = new firepick.DeltaCalculator();
		var xyz = dc.calcXYZ({
			theta1: 0,
			theta2: 0,
			theta3: 0
		});
		should.exist(xyz);
		var epsilon = 0.0000000000001;
		xyz.x.should.within(0-epsilon, 0+epsilon);
		xyz.y.should.within(0-epsilon, 0+epsilon);
		xyz.z.should.within(0-epsilon, 0+epsilon);
	});
	it("calcAngles({...}) should calculate the thetas for a straight line", function() {
        var dc = new firepick.DeltaCalculator();
		shouldEqualT({theta1:19.403,theta2:19.403,theta3:19.403}, dc.calcAngles({x:0,y:0,z:-50}));
		shouldEqualT({theta1:19.553,theta2:14.119,theta3:24.683}, dc.calcAngles({x:10,y:0,z:-50}));
		shouldEqualT({theta1:20.000,theta2: 8.858,theta3:29.938}, dc.calcAngles({x:20,y:0,z:-50}));
		shouldEqualT({theta1:20.743,theta2: 3.657,theta3:35.155}, dc.calcAngles({x:30,y:0,z:-50}));
		shouldEqualT({theta1:21.780,theta2:-1.436,theta3:40.325}, dc.calcAngles({x:40,y:0,z:-50}));
		shouldEqualT({theta1:23.107,theta2:-6.366,theta3:45.448}, dc.calcAngles({x:50,y:0,z:-50}));
		shouldEqualT({theta1:24.721,theta2:-11.073,theta3:50.524}, dc.calcAngles({x:60,y:0,z:-50}));
		shouldEqualT({theta1:26.619,theta2:-15.488,theta3:55.559}, dc.calcAngles({x:70,y:0,z:-50}));
		shouldEqualT({theta1:28.800,theta2:-19.547,theta3:60.563}, dc.calcAngles({x:80,y:0,z:-50}));
		shouldEqualT({theta1:31.263,theta2:-23.191,theta3:65.546}, dc.calcAngles({x:90,y:0,z:-50}));
	});
});
