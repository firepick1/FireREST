var should = require("should"),
    module = module || {},
    firepick = firepick || {};

(function(firepick) {
    function Logger(options) {
        var that = this;

		// Options
        options = options || {};
		that.nPlaces = options.nPlaces || 2;
		that.setLevel(options.logLevel);
		that.write = options.write || function(msg) {
			console.log(msg);
		};
		that.write.should.be.Function;

        return that;
    };

    /////////////// INSTANCE ////////////
	Logger.prototype.message = function(args) {
		var that = this;
		var msg = "";
		for (var i=0; i < args.length; i++) {
			if (typeof args[i] ==="object") {
				msg += JSON.stringify(args[i]);
			} else if (typeof args[i] === "number") {
				msg += that.roundN(args[i]);
			} else {
				msg += args[i];
			}
		}
		return msg;
	};
	Logger.prototype.setLevel = function(level) {
		var that = this;
		that.logLevel = level || "info";
        that.logTrace = that.logLevel === "trace";
        that.logDebug = that.logTrace || that.logLevel === "debug";
        that.logInfo = that.logDebug || that.logLevel === "info";
        that.logWarn = that.logInfo || that.logLevel === "warn";
        that.logError = that.logWarn || that.logLevel === "error";
		return that;
	};
	Logger.prototype.error = function(msg) { 
        var that = this;
		if (that.logError) {
			that.write("ERROR	: " + that.message(arguments));
		}
	};
	Logger.prototype.warn = function(msg) { 
        var that = this;
		if (that.logWarn) {
			that.write("WARN	: " + that.message(arguments));
		}
	};
	Logger.prototype.info = function(msg) { 
        var that = this;
		if (that.logInfo) {
			that.write("INFO	: " + that.message(arguments));
		}
	};
	Logger.prototype.debug = function(msg) { 
        var that = this;
		if (that.logDebug) {
			that.write("DEBUG	: " + that.message(arguments));
		}
	};
	Logger.prototype.trace = function(msg) { 
        var that = this;
		if (that.logTrace) {
			that.write("TRACE	: " + that.message(arguments));
		}
	};
    Logger.prototype.round = function(value) {
		var result;
		if (that.nPlaces > 0) {
			result = +(Math.round(value + "e+" + that.nPlaces) + "e-" + that.nPlaces);
		}
		if (isNaN(result)) {
			result = Math.round(value);
		}
		return result;
    };

	////////////// CLASS /////////////////
	Logger.logger = new Logger({
		logLevel:"warn"
	});

    Logger.logger.info("loaded firepick.Logger");
    module.exports = firepick.Logger = Logger;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.Logger", function() {
	var actual;
	var write = function(msg) {
		actual = msg;
	};
    it("should have a default constructor", function() {
		var logger = new firepick.Logger();
		logger.should.have.properties(["logLevel", "write"]);
		logger.logLevel.should.equal("info");
		logger.logError.should.equal(true);
		logger.logWarn.should.equal(true);
		logger.logInfo.should.equal(true);
		logger.logDebug.should.equal(false);
		logger.logTrace.should.equal(false);
    });
	it("should have options", function() {
		var logger = new firepick.Logger({logLevel:"debug"});
		logger.should.have.properties(["logLevel", "write"]);
		logger.logLevel.should.equal("debug");
		logger.logError.should.equal(true);
		logger.logWarn.should.equal(true);
		logger.logInfo.should.equal(true);
		logger.logDebug.should.equal(true);
		logger.logTrace.should.equal(false);
	});
	it("setLevel(level) should set the logging level", function() {
		var logger = new firepick.Logger();
		logger.setLevel("trace");
		logger.logLevel.should.equal("trace");
		logger.logError.should.equal(true);
		logger.logWarn.should.equal(true);
		logger.logInfo.should.equal(true);
		logger.logDebug.should.equal(true);
		logger.logTrace.should.equal(true);
	});
	it("trace(msg) should log to a custom writer", function() {
		var logger = new firepick.Logger({logLevel:"trace", write:write});
		logger.logTrace.should.equal(true);
		logger.trace("T1");
		should.equal(actual, "TRACE	: T1");
	});
	it("debug(msg) should log to a custom writer", function() {
		var logger = new firepick.Logger({logLevel:"debug", write:write});
		logger.logDebug.should.equal(true);
		logger.debug("D1");
		should.equal(actual, "DEBUG	: D1");
		logger.trace("D2");
		should.equal(actual, "DEBUG	: D1");
	});
	it("info(msg) should log to a custom writer", function() {
		var logger = new firepick.Logger({logLevel:"info", write:write});
		logger.logInfo.should.equal(true);
		logger.info("I1",1,2.1,"3",true);
		should.equal(actual, "INFO	: I112.13true");
		logger.debug("I2");
		should.equal(actual, "INFO	: I112.13true");
	});
	it("warn(msg) should log to a custom writer", function() {
		var logger = new firepick.Logger({logLevel:"warn", write:write});
		logger.logWarn.should.equal(true);
		logger.warn("W1", {a:1});
		should.equal(actual, "WARN	: W1{\"a\":1}");
		logger.info("W2");
		should.equal(actual, "WARN	: W1{\"a\":1}");
	});
	it("error(msg) should log to a custom writer", function() {
		var logger = new firepick.Logger({logLevel:"error", write:write});
		logger.logError.should.equal(true);
		logger.error("E1");
		should.equal(actual, "ERROR	: E1");
		logger.warn("E2");
		should.equal(actual, "ERROR	: E1");
	});

});
