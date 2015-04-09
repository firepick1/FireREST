var should = require("should"),
    module = module || {},
    firepick = firepick || {};
firepick.DeltaCalculator = require("./DeltaCalculator");

(function(firepick) {
    function FPDModel(options) {
        options = options || {};
        this.zMax0 = options.zMax0 || 80;
        this.zMin0 = options.zMin0 || 20;
        this.xMax1 = options.xMax1 || 90;
        this.xMin1 = options.xMin1 || -this.xMax1;
        this.xMax2 = options.xMax2 || 90;
        this.xMin2 = options.xMin2 || -this.xMax2;
        this.yMax1 = options.yMax1 || 90;
        this.yMin1 = options.yMin1 || -this.yMax1;
        this.yMax2 = options.yMax2 || 90;
        this.yMin2 = options.yMin2 || -this.yMax2;
        this.dc = new firepick.DeltaCalculator({
            e: options.effectorTriangleSide,
            f: options.baseTriangleSide,
            re: options.effectorArmLength,
            rf: options.baseArmLength,
        });
        this.angles = {
            theta1: 0,
            theta2: 0,
            theta3: 0
        };
        this.xyz = this.dc.calcXYZ(this.angles);
        return this;
    };

    /////////////// INSTANCE ////////////
    FPDModel.prototype.isValid = function() {
        return !(this.angles == null || this.xyz == null);
    }
    FPDModel.prototype.deltaModel = function() {
        return this.dc;
    };
    FPDModel.prototype.setXYZ = function(x, y, z) {
        x.should.be.Number;
        y.should.be.Number;
        z.should.be.Number;
        this.xyz = {
            x: x,
            y: y,
            z: z
        };
        this.angles = this.dc.calcAngles(this.xyz);
        return this;
    };
    FPDModel.prototype.setAngles = function(theta1, theta2, theta3) {
        theta1.should.be.Number;
        theta2.should.be.Number;
        theta3.should.be.Number;
        this.angles = {
            theta1: theta1,
            theta2: theta2,
            theta3: theta3
        };
        this.xyz = this.dc.calcXYZ(this.angles);
        return this;
    };
    /////////////// CLASS ////////////////
    FPDModel.validate = function(fm) {
        var epsilon = 0.0000001;
        describe("FPDModel.validate(" + fm.constructor.name + ")", function() {
            it("should have a delta model", function() {
                var dm = fm.deltaModel();
                dm.should.exist;
                dm.e.should.be.a.Number; // effectorTriangleSide
                dm.f.should.be.a.Number; // baseTriangleSide
                dm.re.should.be.a.Number; // effectorArmLength
                dm.rf.should.be.a.Number; // baseArmLength
                dm.dz.should.be.a.Number; // Z offset
            });
            it("should have primary Z-axis bounds", function() {
                fm.zMin0.should.be.a.Number;
                fm.zMax0.should.be.a.Number;
                fm.zMin0.should.be.below(fm.zMax0);
            });
            it("should have free movement bounds", function() {
                fm.xMin1.should.be.a.Number;
                fm.xMax1.should.be.a.Number;
                fm.xMin1.should.be.below(fm.xMax1);
                fm.yMin1.should.be.a.Number;
                fm.yMax1.should.be.a.Number;
                fm.yMin1.should.be.below(fm.yMax1);
            });
            it("should have restricted movement bounds", function() {
                fm.xMin2.should.be.a.Number;
                fm.xMax2.should.be.a.Number;
                fm.xMin2.should.be.below(fm.xMax2);
                fm.yMin2.should.be.a.Number;
                fm.yMax2.should.be.a.Number;
                fm.yMin2.should.be.below(fm.yMax2);
            });
            it("should have an initial zero-angle position", function() {
                fm.angles.theta1.should.equal(0);
                fm.angles.theta2.should.equal(0);
                fm.angles.theta3.should.equal(0);
            });
            it("should have an initial XYZ position", function() {
                fm.xyz.x.should.be.Number;
                fm.xyz.y.should.be.Number;
                fm.xyz.z.should.be.Number;
            });
            it("should have valid coordinates", function() {
                should.ok(fm.isValid());
            });
            it("should have XYZ origin at theta(0,0,0)", function() {
                fm.setAngles(0, 0, 0);
                fm.xyz.x.should.within(-epsilon, epsilon);
                fm.xyz.y.should.within(-epsilon, epsilon);
                fm.xyz.z.should.within(-epsilon, epsilon);
                fm.setXYZ(0, 0, 0);
                fm.angles.theta1.should.within(-epsilon, epsilon);
                fm.angles.theta2.should.within(-epsilon, epsilon);
                fm.angles.theta3.should.within(-epsilon, epsilon);
            });
        });
    };

    Logger.logger.info("loaded firepick.FPDModel");
    module.exports = firepick.FPDModel = FPDModel;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.FPDModel test", function() {
    var FPDModel = new firepick.FPDModel();
    firepick.FPDModel.validate(FPDModel);
})
