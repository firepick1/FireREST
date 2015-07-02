#! /usr/bin/nodejs

Util = require("../server/firepick/Util");
Bernstein = require("../server/firepick/Bernstein");

console.log("Hello");
var b = new Bernstein(5);

console.log("Bernstein(5,3,0.4): ", b.coefficient(3,0.4));
