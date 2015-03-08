var should = require("should"),
    module = module || {},
    firepick = firepick || {};

(function(firepick) {
	var that = {};
	var id = 0;
	that.id = id++;

    function Util(solver, options) {
		this.id = id++;
        return this;
    };

    ///////////////// INSTANCE ///////////////
	Util.prototype.thisId = function() {
		return this.id;
	}
	Util.prototype.thatId = function() {
		return that.id;
	}
	Util.prototype.id = function() {
		return id;
	}
	Util.id = function() {
		return id;
	}
    Util.roundN = function(value, places) {
        return +(Math.round(value + "e+" + places) + "e-" + places);
	};

    console.log("LOADED	: firepick.Util");
    module.exports = firepick.Util = Util;
})(firepick || (firepick = {}));

(function (firepick) {
	function Caller(callee) {
		this.callee = callee;
		return this;
	};
	Caller.prototype.invoke = function(eThat, eThis) {
		should.equal(this.callee.thatId(), eThat);
		should.equal(this.callee.thisId(), eThis);
	};
	firepick.Caller = Caller;
})(firepick);

(typeof describe === 'function') && describe("firepick.Util", function() {
	it("should roundN(3.14159,2) to two places", function() {
		should(firepick.Util.roundN(3.14159,2)).equal(3.14);
    });
	it("should do this and that", function() {
		var util1 = new firepick.Util();
		var util2 = new firepick.Util();
		should.equal(util1.thatId(), 0);
		should.equal(util1.thisId(), 1);
		should.equal(util2.thatId(), 0);
		should.equal(util2.thisId(), 2);
		var caller1 = new firepick.Caller(util1);
		var caller2 = new firepick.Caller(util2);
		caller1.invoke(0,1);
		caller2.invoke(0,2);
	});
})
