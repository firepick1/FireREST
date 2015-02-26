var should = require("should"),
    module = module || {},
    firepick;

function isNumeric(obj) {
    return (obj - parseFloat(obj) + 1) >= 0;
}

(function(firepick) {
    function XYZPositioner(writer) {
        this.feedRate = 6000;
        this.sync = "M400";
		this.$position = {};
        this.write = writer || function(cmd) {
            console.log("XYZPositioner:" + cmd);
        }
        return this;
    }
	XYZPositioner.validate = function(xyzPositioner) {
		describe("XYZPositioner validation test", function() {
			should.exist(xyzPositioner);
			it("should home ", function() {
				should.exist(xyzPositioner.home, "home not implemented");
			});
			it("should move to origin", function() {
				should.exist(xyzPositioner.origin, "origin not implemented");
				should.deepEqual({x:0,y:0,z:0}, xyzPositioner.origin().position());
			});
			it("should move to (1,2,3)", function() {
				should.exist(xyzPositioner.move, "move not implemented");
				should.deepEqual({x:1,y:2,z:3}, xyzPositioner.move({x:1,y:2,z:3}).position());
			});
			it("should move to origin", function() {
				should.deepEqual({x:0,y:0,z:0}, xyzPositioner.origin().position());
			});
			it("should move to (1,2,3)", function() {
				should.deepEqual({x:1,y:2,z:3}, xyzPositioner.move([{x:1},{y:2},{z:3}]).position()); 
			});
		});
		return true;
	}
    XYZPositioner.prototype.withWriter = function(writer) {
		should.exist(writer);
        this.write = writer;
        return this;
    }
    XYZPositioner.prototype.withSync = function(sync) { // M400: Wait for move to finish
        this.sync = sync;
        return this;
    }
    XYZPositioner.prototype.withFeedRate = function(feedRate) { // Fxxx: Feed rate in mm/min
		should.ok(isNumeric(feedRate));
		should(feedRate).above(0);
        this.feedRate = feedRate;
		this.write("G0F" + this.feedRate);
        return this;
    }
    XYZPositioner.prototype.home = function() {
        this.write("G28");
        return this;
    }
    XYZPositioner.prototype.origin = function() {
        this.home();
		this.withFeedRate(this.feedRate);
		this.move({x:0,y:0,z:0});
		this.$position = {x:0,y:0,z:0};
        return this;
    }
	XYZPositioner.prototype.position = function() {
		return this.$position;
	}
    XYZPositioner.prototype.move = function(path) {
		if (!Array.isArray(path) && typeof(path) === 'object') {
			path = [path];
		}
		should.ok(Array.isArray(path), "path: expected array of {x,y,z,feedRate} positions");
		for (var i=0; i < path.length; i++) {
			var move = path[i];
			if (isNumeric(move.feedRate)) {
				this.withFeedRate(move.feedRate);
			}
			if (move.hasOwnProperty("x") || move.hasOwnProperty("y") || move.hasOwnProperty("z")) {
				this.moveTo(move.x, move.y, move.z);
			}
		}
        this.write(this.sync);
		return this;
	}
    XYZPositioner.prototype.moveTo = function(x, y, z) {
        var coord = (isNumeric(x) ? ("X" + x) : "") + (isNumeric(y) ? ("Y" + y) : "") + (isNumeric(z) ? ("Z" + z) : "");
        this.write("G0" + coord);
		this.$position = {
			x: (isNumeric(x) ? x : this.$position.x),
			y: (isNumeric(y) ? y : this.$position.y),
			z: (isNumeric(z) ? z : this.$position.z),
		};
        return this;
    }
    XYZPositioner.prototype.moveToSync = function(x, y, z) {
		this.moveTo(x,y,z);
        this.write(this.sync);
        return this;
    }

    console.log("LOADED	: firepick.XYZPositioner");
    module.exports = firepick.XYZPositioner = XYZPositioner;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.XYZPositioner test", function() {
    var output1 = undefined;
	var output2 = undefined;

    function testWriter1(cmd) {
        output1 = output1 ? (output1 + ";" + cmd) : cmd;
    }

    function testWriter2(cmd) {
		testWriter1(cmd);
        output2 = output2 ? (output2 + ";" + cmd) : cmd;
    }
    var xyz = new firepick.XYZPositioner(testWriter1);

    function assertCommand(result, expected) {
        should(result).equal(xyz, "expected fluent call returning xyz object");
        should(output1).equal(expected);
        output1 = undefined;
    }

    it("should home", function() {
        assertCommand(xyz.home(), "G28");
    });
    it("should origin", function() {
        assertCommand(xyz.origin(), "G28;G0F6000;G0X0Y0Z0;M400");
    });
    it("should withFeedRate(feedRate)", function() {
        assertCommand(xyz.withFeedRate(7000), "G0F7000");
        assertCommand(xyz.withFeedRate(6000), "G0F6000");
    });
    it("should withWriter(writer)", function() {
		should.not.exist(output2);
        assertCommand(xyz.withWriter(testWriter2).origin(), "G28;G0F6000;G0X0Y0Z0;M400");
		should.equal("G28;G0F6000;G0X0Y0Z0;M400", output2);
		should.deepEqual({x:0,y:0,z:0}, xyz.position());
    });
    it("should withSync(sync)", function() {
        assertCommand(xyz.withSync("m400").origin(), "G28;G0F6000;G0X0Y0Z0;m400");
        assertCommand(xyz.withSync("M400").origin(), "G28;G0F6000;G0X0Y0Z0;M400");
		should.deepEqual({x:0,y:0,z:0}, xyz.position());
    });
    it("should moveToSync(x,y,z)", function() {
        assertCommand(xyz.withWriter(testWriter2).origin(), "G28;G0F6000;G0X0Y0Z0;M400");
        assertCommand(xyz.moveToSync(), "G0;M400");
        assertCommand(xyz.moveToSync(1), "G0X1;M400");
		should.deepEqual({x:1,y:0,z:0}, xyz.position());
        assertCommand(xyz.withWriter(testWriter2).origin(), "G28;G0F6000;G0X0Y0Z0;M400");
        assertCommand(xyz.moveToSync(null, 2), "G0Y2;M400");
		should.deepEqual({x:0,y:2,z:0}, xyz.position());
        assertCommand(xyz.withWriter(testWriter2).origin(), "G28;G0F6000;G0X0Y0Z0;M400");
        assertCommand(xyz.moveToSync(null, null, 3), "G0Z3;M400");
		should.deepEqual({x:0,y:0,z:3}, xyz.position());
        assertCommand(xyz.withWriter(testWriter2).origin(), "G28;G0F6000;G0X0Y0Z0;M400");
        assertCommand(xyz.moveToSync(1, 2, 3), "G0X1Y2Z3;M400");
		should.deepEqual({x:1,y:2,z:3}, xyz.position());
    });
	it("should move(path)", function() {
        assertCommand(xyz.origin(), "G28;G0F6000;G0X0Y0Z0;M400");
		should.throws((function () {xyz.path();}));
		should.throws((function () {xyz.path(1,2,3);}));
        assertCommand(xyz.move([{x:10,y:20,z:30}]), "G0X10Y20Z30;M400");
        assertCommand(xyz.move([{x:1,y:2,z:3},{feedRate:4000},{y:20}]), 
			"G0X1Y2Z3;G0F4000;G0Y20;M400");
        assertCommand(xyz.move([{op:"move", x:-1.1,y:-2.2,z:-3.3},{feedRate:4000},{y:-20.20}]), 
			"G0X-1.1Y-2.2Z-3.3;G0F4000;G0Y-20.2;M400");
	});
	it("should validate as XYZPositioner", function() {
		should.ok(firepick.XYZPositioner.validate(xyz));
	});
})
