var should = require("should"),
    module = module || {},
    firepick;

function isNumeric(obj) {
    return (obj - parseFloat(obj) + 1) >= 0;
}

(function(firepick) {
    function GCodeDriver(writer) {
        this.feedRate = 6000;
        this.sync = "M400";
        this.write = writer || function(cmd) {
            console.log(cmd);
        }
        return this;
    }
    GCodeDriver.prototype.withWriter = function(writer) {
        this.write = writer;
        return this;
    }
    GCodeDriver.prototype.withSync = function(sync) { // M400: Wait for move to finish
        this.sync = sync;
        return this;
    }
    GCodeDriver.prototype.withFeedRate = function(feedRate) { // Fxxx: Feed rate in mm/min
        this.feedRate = feedRate;
        return this;
    }
    GCodeDriver.prototype.home = function() {
        this.write("G28");
        return this;
    }
    GCodeDriver.prototype.origin = function() {
        this.home();
        this.write("G0Z0F" + this.feedRate + this.sync);
        return this;
    }
    GCodeDriver.prototype.moveTo = function(x, y, z) {
        var coord = (isNumeric(x) ? ("X" + x) : "") + (isNumeric(y) ? ("Y" + y) : "") + (isNumeric(z) ? ("Z" + z) : "");
        this.write("G0" + coord + this.sync);
        return this;
    }

    console.log("firepick.GCodeDriver");
    module.exports = firepick.GCodeDriver = GCodeDriver;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.GCodeDriver test", function() {
    var output = undefined;

    function testWriter1(cmd) {
        output = output ? (output + ";" + cmd) : cmd;
    }

    function testWriter2(cmd) {
        output = output ? (output + "|" + cmd) : cmd;
    }
    var gcode = new firepick.GCodeDriver(testWriter1);

    function assertCommand(result, expected) {
        should(result).equal(gcode, "expected fluent call returning gcode object");
        should(output).equal(expected);
        output = undefined;
    }

    it("should home", function() {
        assertCommand(gcode.home(), "G28");
    });
    it("should origin", function() {
        assertCommand(gcode.origin(), "G28;G0Z0F6000M400");
    });
    it("should withFeedRate", function() {
        assertCommand(gcode.withFeedRate(7000).origin(), "G28;G0Z0F7000M400");
        assertCommand(gcode.withFeedRate(6000).origin(), "G28;G0Z0F6000M400");
    });
    it("should withWriter", function() {
        assertCommand(gcode.withWriter(testWriter2).origin(), "G28|G0Z0F6000M400");
        assertCommand(gcode.withWriter(testWriter1).origin(), "G28;G0Z0F6000M400");
    });
    it("should withSync", function() {
        assertCommand(gcode.withSync("m400").origin(), "G28;G0Z0F6000m400");
        assertCommand(gcode.withSync("M400").origin(), "G28;G0Z0F6000M400");
    });
    it("should moveTo", function() {
        assertCommand(gcode.moveTo(), "G0M400");
        assertCommand(gcode.moveTo(1), "G0X1M400");
        assertCommand(gcode.moveTo(null, 2), "G0Y2M400");
        assertCommand(gcode.moveTo(null, null, 3), "G0Z3M400");
        assertCommand(gcode.moveTo(1, 2, 3), "G0X1Y2Z3M400");
    });
})
