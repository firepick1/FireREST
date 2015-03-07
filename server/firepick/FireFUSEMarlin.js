var should = require("should"),
    module = module || {},
    firepick = firepick || {};
firepick.XYZPositioner = require("./XYZPositioner");
var fs = require('fs');

var firefuse_path = "/dev/firefuse/sync/cnc/marlin/gcode.fire";
//var firefuse_path = "/tmp/Marlin";

(function(firepick) {
    function FireFUSEMarlin(path) {
        this.path = path || firefuse_path;
        var writer = function(data) {
            throw new Error("FireFUSEMarlin is unavailable");
        }
        try {
            this.stat = fs.statSync(this.path);
            var fd = fs.openSync(this.path, 'w');
            this.fd = fd;
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
            this.err = err;
        }
        this.xyz = new firepick.XYZPositioner(writer);
        return this;
    };
    FireFUSEMarlin.prototype.health = function() {
        return this.err == null ? 1 : 0;
    };
    FireFUSEMarlin.prototype.home = function() {
        this.xyz.home();
        return this;
    };
    FireFUSEMarlin.prototype.origin = function() {
        this.xyz.origin();
        return this;
    };
    FireFUSEMarlin.prototype.move = function(path) {
        this.xyz.move(path);
        return this;
    };
    FireFUSEMarlin.prototype.getXYZ = function() {
        return this.xyz.getXYZ();
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
