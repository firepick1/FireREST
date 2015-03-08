var should = require("should"),
    module = module || {},
    firepick = firepick || {};

(function(firepick) {
	var that;
    function Util(solver, options) {
		that = this;
        return that;
    };


    ///////////////// INSTANCE ///////////////
    Util.roundN = function(value, places) {
        return +(Math.round(value + "e+" + places) + "e-" + places);
	};

    console.log("LOADED	: firepick.Util");
    module.exports = firepick.Util = Util;
})(firepick || (firepick = {}));

(typeof describe === 'function') && describe("firepick.Util", function() {
	it("should roundN(3.14159,2) to two places", function() {
		should(firepick.Util.roundN(3.14159,2)).equal(3.14);
    });
})
