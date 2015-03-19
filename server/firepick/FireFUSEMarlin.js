var should = require("should"),
    module = module || {},
    firepick = firepick || {};
firepick.XYZPositioner = require("./XYZPositioner");
var fs = require('fs');

var firefuse_path = "/dev/firefuse/sync/cnc/marlin/gcode.fire";
//var firefuse_path = "/tmp/Marlin";

(function(firepick) {
    function FireFUSEMarlin(path, options) {
		var that = this;
        that.path = path || firefuse_path;
		options = options || {};
        var writer = function(data) {
            throw new Error("FireFUSEMarlin is unavailable");
        }
        try {
            that.stat = fs.statSync(that.path);
            var fd = fs.openSync(that.path, 'w');
            that.fd = fd;
            writer = function(data) {
                var bytes = fs.writeSync(fd, data);
                //console.log("FireFUSEMarlin("+data+")");
                //fs.fsyncSync(fd); 
                return bytes;
            };
        } catch (err) {
            if (err.code != "ENOENT") {
                console.log(err);
            }
            that.err = err;
        }
        that.xyz = new firepick.XYZPositioner(writer);
		that.setFeedRate(options.feedRate || 3000);
        return that;
    };
    FireFUSEMarlin.prototype.setFeedRate = function(feedRate) {
		var that = this;
		if (that.err == null) {
			that.xyz.setFeedRate(feedRate);
		}
		that.feedRate = feedRate;
		return that;
    };
    FireFUSEMarlin.prototype.health = function() {
		var that = this;
        return that.err == null ? 1 : 0;
    };
    FireFUSEMarlin.prototype.home = function() {
		var that = this;
		if (that.err) { throw that.err; }
        that.xyz.home();
        return that;
    };
    FireFUSEMarlin.prototype.origin = function() {
		var that = this;
		if (that.err) { throw that.err; }
        that.xyz.origin();
        return that;
    };
    FireFUSEMarlin.prototype.move = function(path) {
		var that = this;
		if (that.err) { throw that.err; }
        that.xyz.move(path);
        return that;
    };
    FireFUSEMarlin.prototype.getXYZ = function() {
		var that = this;
		if (that.err) { throw that.err; }
        return that.xyz.getXYZ();
    };

    console.log("LOADED	: firepick.FireFUSEMarlin");
    module.exports = firepick.FireFUSEMarlin = FireFUSEMarlin;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.FireFUSEMarlin test", function() {
    var ffm;
    var ffm_bad;
    it("should be creatable", function() {
        should.doesNotThrow((function() {
            ffm = new firepick.FireFUSEMarlin();
        }));
        should.exist(ffm, "FireFUSEMarlin");
        should.doesNotThrow((function() {
            ffm_bad = new firepick.FireFUSEMarlin("no/such/path")
        }), "no/such/path");
    });
    it("should have Marlin path", function() {
        should(ffm.path).equal(firefuse_path);
        should(ffm_bad.path).equal("no/such/path");
    });
    it("should be an XYZPositioner", function() {
        if (ffm.health() === 0) {
            console.log("WARNING	: FireFUSE Marlin is unavailable (test skipped)");
        }
        should.ok(firepick.XYZPositioner.validate(ffm, "FireFUSEMarlin"));
    });
});
