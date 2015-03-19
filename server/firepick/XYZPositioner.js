var should = require("should"),
    module = module || {},
    firepick;

function isNumeric(obj) {
    return (obj - parseFloat(obj) + 1) >= 0;
}

(function(firepick) {
    function XYZPositioner(writer) {
		var that = this;
        that.feedRate = 6000;
        that.sync = "M400";
        that.xyz = {};
        that.write = writer || function(cmd) { /* default discards data */ }
        return that;
    }
    XYZPositioner.validate = function(xyzPositioner) {
        describe("XYZPositioner validate(" + xyzPositioner.constructor.name + ")", function() {
            should.exist(xyzPositioner);
            it("should define XYZPositioner methods", function() {
                should(xyzPositioner).have.properties([ 
					"home", "getXYZ", "origin", "move", "health", "setFeedRate",
					]);
                xyzPositioner.home.should.be.Function;
                xyzPositioner.getXYZ.should.be.Function;
                xyzPositioner.origin.should.be.Function;
                xyzPositioner.move.should.be.Function;
                xyzPositioner.health.should.be.Function;
                xyzPositioner.setFeedRate.should.be.Function;
            });
            if (xyzPositioner.health() === 0) {
                it("should throw errors when not available", function() {
                    should.throws(function() {
                        xyzPositioner.home();
                    });
                    should.throws(function() {
                        xyzPositioner.origin();
                    });
                    should.throws(function() {
                        xyzPositioner.move();
                    });
                });
            } else {
                it("should move to origin", function() {
                    this.timeout(5000);
                    should.equal(xyzPositioner, xyzPositioner.origin());
                    should.deepEqual({
                        x: 0,
                        y: 0,
                        z: 0
                    }, xyzPositioner.getXYZ());
                });
                it("should move to a single position {x:1,y:2,z:3}", function() {
                    this.timeout(5000);
                    should.equal(xyzPositioner, xyzPositioner.move({
                        x: 1,
                        y: 2,
                        z: 3
                    }));
                    should.deepEqual({
                        x: 1,
                        y: 2,
                        z: 3
                    }, xyzPositioner.getXYZ());
                });
                it("should move along a path [{x:1},{y:2},{z:3}]", function() {
                    this.timeout(5000);
                    xyzPositioner.move({
                        x: 0,
                        y: 0,
                        z: 0
                    });
                    should.equal(xyzPositioner, xyzPositioner.move([{
                        x: 1
                    }, {
                        y: 2
                    }, {
                        z: 3
                    }]));
                    should.deepEqual({
                        x: 1,
                        y: 2,
                        z: 3
                    }, xyzPositioner.getXYZ());
                });
            }
        });
        return true;
    }
    XYZPositioner.prototype.withWriter = function(writer) {
		var that = this;
        should.exist(writer);
        that.write = writer;
        return that;
    }
    XYZPositioner.prototype.withSync = function(sync) { // M400: Wait for move to finish
		var that = this;
        that.sync = sync;
        return that;
    }
    XYZPositioner.prototype.setFeedRate = function(feedRate) { // Fxxx: Feed rate in mm/min
		var that = this;
        should.ok(isNumeric(feedRate));
        should(feedRate).above(0);
        that.feedRate = feedRate;
        that.write("G0F" + that.feedRate);
        return that;
    }
    XYZPositioner.prototype.home = function() {
		var that = this;
        that.write("G28");
        return that;
    }
    XYZPositioner.prototype.origin = function() {
		var that = this;
        that.home();
        that.setFeedRate(that.feedRate);
        that.move({
            x: 0,
            y: 0,
            z: 0
        });
        that.xyz = {
            x: 0,
            y: 0,
            z: 0
        };
        return that;
    }
    XYZPositioner.prototype.getXYZ = function() {
		var that = this;
        return that.xyz;
    }
    XYZPositioner.prototype.move = function(path) {
		var that = this;
        if (!Array.isArray(path) && typeof(path) === 'object') {
            path = [path];
        }
        should.ok(Array.isArray(path), "path: expected array of {x,y,z,feedRate} positions");
        for (var i = 0; i < path.length; i++) {
            var move = path[i];
            if (isNumeric(move.feedRate)) {
                that.setFeedRate(move.feedRate);
            }
            if (move.hasOwnProperty("x") || move.hasOwnProperty("y") || move.hasOwnProperty("z")) {
                that.moveTo(move.x, move.y, move.z);
            }
        }
        that.write(that.sync);
        return that;
    }
    XYZPositioner.prototype.moveTo = function(x, y, z) {
		var that = this;
        var coord = (isNumeric(x) ? ("X" + x) : "") + (isNumeric(y) ? ("Y" + y) : "") + (isNumeric(z) ? ("Z" + z) : "");
        that.write("G0" + coord);
        that.xyz = {
            x: (isNumeric(x) ? x : that.xyz.x),
            y: (isNumeric(y) ? y : that.xyz.y),
            z: (isNumeric(z) ? z : that.xyz.z),
        };
        return that;
    }
    XYZPositioner.prototype.moveToSync = function(x, y, z) {
		var that = this;
        that.moveTo(x, y, z);
        that.write(that.sync);
        return that;
    }
    XYZPositioner.prototype.health = function() {
		var that = this;
        return 1;
    }

    console.log("LOADED	: firepick.XYZPositioner");
    module.exports = firepick.XYZPositioner = XYZPositioner;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.XYZPositioner", function() {
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
    it("should setFeedRate(feedRate)", function() {
        assertCommand(xyz.setFeedRate(7000), "G0F7000");
        assertCommand(xyz.setFeedRate(6000), "G0F6000");
    });
    it("should withWriter(writer)", function() {
        should.not.exist(output2);
        assertCommand(xyz.withWriter(testWriter2).origin(), "G28;G0F6000;G0X0Y0Z0;M400");
        should.equal("G28;G0F6000;G0X0Y0Z0;M400", output2);
        should.deepEqual({
            x: 0,
            y: 0,
            z: 0
        }, xyz.getXYZ());
    });
    it("should withSync(sync)", function() {
        assertCommand(xyz.withSync("m400").origin(), "G28;G0F6000;G0X0Y0Z0;m400");
        assertCommand(xyz.withSync("M400").origin(), "G28;G0F6000;G0X0Y0Z0;M400");
        should.deepEqual({
            x: 0,
            y: 0,
            z: 0
        }, xyz.getXYZ());
    });
    it("should moveToSync(x,y,z)", function() {
        assertCommand(xyz.withWriter(testWriter2).origin(), "G28;G0F6000;G0X0Y0Z0;M400");
        assertCommand(xyz.moveToSync(), "G0;M400");
        assertCommand(xyz.moveToSync(1), "G0X1;M400");
        should.deepEqual({
            x: 1,
            y: 0,
            z: 0
        }, xyz.getXYZ());
        assertCommand(xyz.withWriter(testWriter2).origin(), "G28;G0F6000;G0X0Y0Z0;M400");
        assertCommand(xyz.moveToSync(null, 2), "G0Y2;M400");
        should.deepEqual({
            x: 0,
            y: 2,
            z: 0
        }, xyz.getXYZ());
        assertCommand(xyz.withWriter(testWriter2).origin(), "G28;G0F6000;G0X0Y0Z0;M400");
        assertCommand(xyz.moveToSync(null, null, 3), "G0Z3;M400");
        should.deepEqual({
            x: 0,
            y: 0,
            z: 3
        }, xyz.getXYZ());
        assertCommand(xyz.withWriter(testWriter2).origin(), "G28;G0F6000;G0X0Y0Z0;M400");
        assertCommand(xyz.moveToSync(1, 2, 3), "G0X1Y2Z3;M400");
        should.deepEqual({
            x: 1,
            y: 2,
            z: 3
        }, xyz.getXYZ());
    });
    it("should move(path)", function() {
        assertCommand(xyz.origin(), "G28;G0F6000;G0X0Y0Z0;M400");
        should.throws((function() {
            xyz.path();
        }));
        should.throws((function() {
            xyz.path(1, 2, 3);
        }));
        assertCommand(xyz.move([{
            x: 10,
            y: 20,
            z: 30
        }]), "G0X10Y20Z30;M400");
        assertCommand(xyz.move([{
                x: 1,
                y: 2,
                z: 3
            }, {
                feedRate: 4000
            }, {
                y: 20
            }]),
            "G0X1Y2Z3;G0F4000;G0Y20;M400");
        assertCommand(xyz.move([{
                op: "move",
                x: -1.1,
                y: -2.2,
                z: -3.3
            }, {
                feedRate: 4000
            }, {
                y: -20.20
            }]),
            "G0X-1.1Y-2.2Z-3.3;G0F4000;G0Y-20.2;M400");
    });
    it("should validate as XYZPositioner", function() {
        should.ok(firepick.XYZPositioner.validate(xyz, "XYZPositioner"));
    });
})
