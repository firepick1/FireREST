var should = require("should"),
    module = module || {},
    firepick;
Logger = require("./Logger");
FeedRateCalibrater = require("./FeedRateCalibrater");
XYZPositioner = require("./XYZPositioner");
Util = require("./Util");


(function(firepick) {
    function XYZSmoother(options) {
		var that = this;
		options = options || {};
		var mmps = 4000/60;
		that.jerk = options.jerk || mmps*mmps;
		that.maxFeedRate = options.maxFeedRate || 20000;
        that.xyz = options.xyz || new XYZPositioner(options);
        that.write = options.write || function(cmd) { /* default discards data */ }
		that.logger = options.logger || new Logger(options);
        return that;
    }
    XYZSmoother.prototype.setFeedRate = function(feedRate) { // Fxxx: Feed rate in mm/min
		var that = this;
		that.xyz.setFeedRate(feedRate);
        return that;
    }
    XYZSmoother.prototype.home = function() {
		var that = this;
        that.xyz.home();
        return that;
    }
    XYZSmoother.prototype.origin = function() {
		var that = this;
        that.xyz.origin();
        return that;
    }
    XYZSmoother.prototype.getXYZ = function() {
		var that = this;
        return that.xyz.getXYZ();
    }
    XYZSmoother.prototype.move = function(path) {
		var that = this;
		that.xyz.move(path);
        return that;
    }
    XYZSmoother.prototype.moveTo = function(x, y, z) {
		var that = this;
		that.move({x:x,y:y,z:z});
        return that;
    }
    XYZSmoother.prototype.moveToSync = function(x, y, z) {
		var that = this;
		var curPos = that.xyz.getXYZ();
		var dx = x-curPos.x;
		var dy = y-curPos.y;
		var dz = z-curPos.z;
		var dist = Math.sqrt(dx*dx+dy*dy+dz*dz);
		var d2 = dist/2;
		var fr = Math.min(that.xyz.feedRate/d2,that.maxFeedRate)*d2;
		
        that.moveTo(x, y, z);

        that.xyz.moveToSync(x,y,z);
        return that;
    }
	XYZSmoother.tween = function(n,p1,p2,v1,v2) {
		var that = this;
		var dp = {x:p2.x-p1.x,y:p2.y-p1.y,z:p2.z-p1.z};
		var dnorm2 = dp.x*dp.x + dp.y*dp.y + dp.z*dp.z;
		var dnorm = Math.sqrt(dnorm2);
		var result = [];
		var dt = 1/n;

		for (var i=1; i <= n; i++) {
			var t = i/n;
			var vi = FeedRateCalibrater.interpolate(v1,v2,t);
			var p = {};
		}

		return result;
	}
    XYZSmoother.prototype.health = function() {
		var that = this;
        return 1;
    }

    Logger.logger.info("loaded firepick.XYZSmoother");
    module.exports = firepick.XYZSmoother = XYZSmoother;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.XYZSmoother", function() {
    var output1 = undefined;
    var output2 = undefined;

    function testWriter(cmd) {
        output1 = output1 ? (output1 + ";" + cmd) : cmd;
    }

    var xyz = new firepick.XYZSmoother({write:testWriter});

    function assertCommand(result, expected) {
        should(result).equal(xyz, "expected fluent call returning xyz object");
        should(output1).equal(expected);
        output1 = undefined;
    }

    it("should home", function() {
        assertCommand(xyz.home(), "G28");
    });
    it("should validate as XYZSmoother", function() {
        should.ok(XYZPositioner.validate(xyz, "XYZSmoother"));
    });
})
