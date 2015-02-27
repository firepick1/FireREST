var should = require("should"),
    module = module || {},
    firepick = firepick || {};
firepick.XYZPositioner = require("./XYZPositioner");
var fs = require('fs');
	
var firefuse_path = "/dev/firefuse/sync/cnc/marlin/gcode.fire";
//var firefuse_path = "/tmp/Marlin";

(function(firepick) {
	function check(err) {
		if (err) throw { message: "FireFUSEMarlin is unavailable", cause: err };
	}
    function FireFUSEMarlin(path) {
		this.path = path || firefuse_path;
		var writer = function(data) { throw "FireFUSEMarlin is unavailable"; }
		try { 
			this.stat = fs.statSync(this.path);
			var fd = fs.openSync(this.path, 'w');
			this.fd = fd;
			writer = function(data) { return fs.write(fd, data); };
		} catch (err) {
			if (err.code != "ENOENT") { console.log(err); }
			this.err = err;
		}
		this.xyz = new firepick.XYZPositioner(writer);
        return this;
    };
    FireFUSEMarlin.prototype.isAvailable = function() {
		return typeof this.err === 'undefined';
	};
	FireFUSEMarlin.prototype.home = function() { this.xyz.home(); return this;};
	FireFUSEMarlin.prototype.origin = function() { this.xyz.origin(); return this;};
	FireFUSEMarlin.prototype.move = function(path) { this.xyz.move(path); return this;};
    FireFUSEMarlin.prototype.write = function(data) { fs.write(this.fd, data); return this;};
    FireFUSEMarlin.prototype.position = function() { return this.xyz.position(); };

    console.log("LOADED	: firepick.FireFUSEMarlin");
    module.exports = firepick.FireFUSEMarlin = FireFUSEMarlin;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.FireFUSEMarlin test", function() {
    var ffm;
	var ffm_bad;
	it("should be creatable", function() {
		should.exist(firepick, "firepick exists");
		should.exist(firepick.FireFUSEMarlin, "firepick.FireFUSEMarlin exists");
		should.doesNotThrow((function(){
			ffm = new firepick.FireFUSEMarlin();
		}));
		should.exist(ffm, "FireFUSEMarlin");
		should.doesNotThrow((function(){
			ffm_bad = new firepick.FireFUSEMarlin("no/such/path")
		}), "no/such/path");
	});
    it("should have Marlin path", function() {
        should(ffm.path).equal(firefuse_path,  'Marlin path');
        should(ffm_bad.path).equal("no/such/path",  'Marlin path');
    });
	it("should throw error when writing without Marlin", function() {
		should.throws((function(){
			ffm_bad.write("G28");
		}));
    });
	it("should be an XYZPositioner", function() {
		should.ok(firepick.XYZPositioner.validate(ffm, "FireFUSEMarlin"));
	});
	if (new firepick.FireFUSEMarlin().isAvailable()) {
		it("should be able to access Marlin via FireFUSE", function() {
			should.equal(ffm.isAvailable(), true, "Marlin unavailable:" + ffm.path);
		});
	} else {
		console.log("WARNING	: FireFUSE Marlin is unavailable (test skipped)");
	}

});
