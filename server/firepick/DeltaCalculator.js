var should = require("should"),
    module = module || {},
    firepick = firepick || {};

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
        options = options || {};
        this.e = options.e || 115; // effector equilateral triangle side
        this.f = options.f || 457.3; // base equilateral triangle side
        this.re = options.re || 232; // effector arm length
        this.rf = options.rf || 112; // base arm length
        this.dz = options.dz || 0;
        return this;
    };
    DeltaCalculator.prototype.calcXYZ = function(angles) {
        angles.theta1.should.be.Number;
        angles.theta2.should.be.Number;
        angles.theta3.should.be.Number;

        var t = (this.f - this.e) * tan30 / 2;
        var theta1 = angles.theta1 * dtr;
        var theta2 = angles.theta2 * dtr;
        var theta3 = angles.theta3 * dtr;
        var y1 = -(t + this.rf * Math.cos(theta1));
        var z1 = -this.rf * Math.sin(theta1);
        var y2 = (t + this.rf * Math.cos(theta2)) * sin30;
        var x2 = y2 * tan60;
        var z2 = -this.rf * Math.sin(theta2);
        var y3 = (t + this.rf * Math.cos(theta3)) * sin30;
        var x3 = -y3 * tan60;
        var z3 = -this.rf * Math.sin(theta3);
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
        var c = (b2 - y1 * dnm) * (b2 - y1 * dnm) + b1 * b1 + dnm * dnm * (z1 * z1 - this.re * this.re);
        // discriminant
        var d = b * b - 4.0 * a * c;
        if (d < 0) { // point exists
            return null;
        }
        var z = -0.5 * (b + Math.sqrt(d)) / a;
        return {
            z: z + this.dz,
            x: (a1 * z + b1) / dnm,
            y: (a2 * z + b2) / dnm
        }
    };
    DeltaCalculator.prototype.calcAngleYZ = function(X, Y, Z) {
        var y1 = -tan30_half * this.f; // f/2 * tg 30
        Y -= tan30_half * this.e; // shift center to edge
        // z = a + b*y
        var a = (X * X + Y * Y + Z * Z + this.rf * this.rf - this.re * this.re - y1 * y1) / (2.0 * Z);
        var b = (y1 - Y) / Z;
        // discriminant
        var d = -(a + b * y1) * (a + b * y1) + this.rf * (b * b * this.rf + this.rf);
        if (d < 0) {
            return null;
        }
        var yj = (y1 - a * b - Math.sqrt(d)) / (b * b + 1.0); // choosing outer point
        var zj = a + b * yj;
        return 180.0 * Math.atan(-zj / (y1 - yj)) / pi + ((yj > y1) ? 180.0 : 0.0);
    };

    DeltaCalculator.prototype.calcAngles = function(xyz) {
        var x = xyz.x;
        var y = xyz.y;
        var z = xyz.z - this.dz;
        x.should.be.Number;
        y.should.be.Number;
        z.should.be.Number;
        var theta1 = this.calcAngleYZ(x, y, z);
        if (theta1 == null) {
            return null;
        }
        var theta2 = this.calcAngleYZ(x * cos120 + y * sin120, y * cos120 - x * sin120, z);
        if (theta2 == null) {
            return null;
        }
        var theta3 = this.calcAngleYZ(x * cos120 - y * sin120, y * cos120 + x * sin120, z);
        if (theta3 == null) {
            return null;
        }
        return {
            theta1: theta1,
            theta2: theta2,
            theta3: theta3
        }
    };
    DeltaCalculator.validate = function(dm) {
        var epsilon = 0.0000001;
        var z0 = -96.8590151711021;
        describe("DeltaCalculator.validate(" + dm.constructor.name + ")", function() {
            it("should have the proper fields", function() {
                should(dm).ownProperty("e");
                should(dm).ownProperty("f");
                should(dm).ownProperty("re");
                should(dm).ownProperty("rf");
            });
            it("should compute the XYZ from a given set of angles", function() {
                var xyz = dm.calcXYZ({
                    theta1: 0,
                    theta2: 0,
                    theta3: 0
                });
                should.exist(xyz);
                xyz.x.should.be.Number;
                xyz.y.should.be.Number;
                xyz.z.should.be.Number;
                xyz.x.should.not.be.NaN;
                xyz.y.should.not.be.NaN;
                xyz.z.should.not.be.NaN;
                xyz.x.should.within(-epsilon, epsilon);
                xyz.y.should.within(-epsilon, epsilon);
                xyz.z.should.within(z0 - epsilon, z0 + epsilon);
            });
            it("should compute the angles from a given XYZ", function() {
                var angles = dm.calcAngles({
                    x: 0,
                    y: 0,
                    z: z0
                });
                should.exist(angles);
                should(angles.theta1).within(-epsilon, epsilon);
                should(angles.theta2).within(-epsilon, epsilon);
                should(angles.theta3).within(-epsilon, epsilon);
            });
            it("should be configurable to have a z-offset", function() {
                dm.dz = -z0;
                var angles = dm.calcAngles({
                    x: 0,
                    y: 0,
                    z: 0
                });
                should.exist(angles);
                should(angles.theta1).within(-epsilon, epsilon);
                should(angles.theta2).within(-epsilon, epsilon);
                should(angles.theta3).within(-epsilon, epsilon);
                var xyz = dm.calcXYZ({
                    theta1: 0,
                    theta2: 0,
                    theta3: 0
                });
                should.exist(xyz);
                xyz.x.should.within(-epsilon, epsilon);
                xyz.y.should.within(-epsilon, epsilon);
                xyz.z.should.within(-epsilon, epsilon);
            });
        });
    };

    console.log("LOADED	: firepick.DeltaCalculator");
    module.exports = firepick.DeltaCalculator = DeltaCalculator;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.DeltaCalculator test", function() {
    firepick.DeltaCalculator.validate(new firepick.DeltaCalculator());
    var ok = true;
    try {
        console.log("DeltaCalculatorTest() BEGIN");
        var dm = new firepick.DeltaCalculator();

        console.log("DeltaCalculatorTest() PASS");
    } catch (ex) {
        console.log("ERROR	: " + ex);
        console.log(ex.stack);
        ok = false;
    }
});
