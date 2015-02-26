var should = require("should"),
    module = module || {},
    firepick = firepick || {};
firepick.XYZPositioner = require("./XYZPositioner");
var fs = require('fs');
	
var firefuse_path = "/dev/firefuse/sync/cnc/marlin/gcode.fire";

(function(firepick) {
    function FireFUSEMarlin(path) {
		this.path = path || firefuse_path;
		try { 
			this.stat = fs.statSync(this.path);
			this.fd = fs.openSync(this.path, 'w');
			this.xyz = new firepick.XYZPositioner(function(data) {
				this.write(data);
			});
		} catch (err) {
			console.log(err);
			this.err = err;
		}
        return this;
    };
    FireFUSEMarlin.prototype.isAvailable = function() {
		return typeof this.err === 'undefined';
	};
	FireFUSEMarlin.prototype.home = function() {
		should.exist(this.xyz);
		return this.xyz.home();
	};
	FireFUSEMarlin.prototype.origin = function() {
		should.exist(this.xyz);
		return this.xyz.origin();
	};
	FireFUSEMarlin.prototype.move = function(path) {
		should.exist(this.xyz);
		return this.xyz.move(path);
	};
    FireFUSEMarlin.prototype.write = function(data) {
        if (this.err) {
			throw {error:"open failed", cause:this.err};
		}
		return fs.write(this.fd, data);
    };

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
	if (new firepick.FireFUSEMarlin().isAvailable()) {
		it("should be able to access Marlin via FireFUSE", function() {
			should.equal(ffm.isAvailable(), true, "Marlin unavailable:" + ffm.path);
		});
		it("should home ", function() {
			should.ok(ffm.write("G28"));
		});
		it("should be an XYZPositioner", function() {
			should.ok(firepick.XYZPositioner.validate(ffm));
		});
	} else {
		console.log("WARNING	: FireFUSE Marlin is unavailable (test skipped)");
	}

});
