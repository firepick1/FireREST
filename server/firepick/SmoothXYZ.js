var should = require("should"),
    module = module || {},
    firepick;
Logger = require("./Logger");
FeedRate = require("./FeedRate");
XYZPositioner = require("./XYZPositioner");


(function(firepick) {
    function SmoothXYZ(options) {
		var that = this;
		options = options || {};
        that.xyz = options.xyz || new XYZPositioner(options);
        that.write = options.write || function(cmd) { /* default discards data */ }
		that.logger = options.logger || new Logger(options);
        return that;
    }
    SmoothXYZ.prototype.setFeedRate = function(feedRate) { // Fxxx: Feed rate in mm/min
		var that = this;
		that.xyz.setFeedRate(feedRate);
        return that;
    }
    SmoothXYZ.prototype.home = function() {
		var that = this;
        that.xyz.home();
        return that;
    }
    SmoothXYZ.prototype.origin = function() {
		var that = this;
        that.xyz.origin();
        return that;
    }
    SmoothXYZ.prototype.getXYZ = function() {
		var that = this;
        return that.xyz.getXYZ();
    }
    SmoothXYZ.prototype.move = function(path) {
		var that = this;
		that.xyz.move(path);
        return that;
    }
    SmoothXYZ.prototype.moveTo = function(x, y, z) {
		var that = this;
		that.move({x:x,y:y,z:z});
        return that;
    }
    SmoothXYZ.prototype.moveToSync = function(x, y, z) {
		var that = this;
        that.moveTo(x, y, z);
        that.xyz.moveToSync(x,y,z);
        return that;
    }
    SmoothXYZ.prototype.health = function() {
		var that = this;
        return 1;
    }

    console.log("LOADED	: firepick.SmoothXYZ");
    module.exports = firepick.SmoothXYZ = SmoothXYZ;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.SmoothXYZ", function() {
    var output1 = undefined;
    var output2 = undefined;

    function testWriter(cmd) {
        output1 = output1 ? (output1 + ";" + cmd) : cmd;
    }

    var xyz = new firepick.SmoothXYZ({write:testWriter});

    function assertCommand(result, expected) {
        should(result).equal(xyz, "expected fluent call returning xyz object");
        should(output1).equal(expected);
        output1 = undefined;
    }

    it("should home", function() {
        assertCommand(xyz.home(), "G28");
    });
    it("should validate as SmoothXYZ", function() {
        should.ok(XYZPositioner.validate(xyz, "SmoothXYZ"));
    });
})
