console.log("loading express...");
var express = require('express');
var fs = require('fs');
var app = express();

app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

var cv_dir = "/dev/firefuse/cv";
console.log("Looking for FireFUSE...");
if (fs.existsSync("/dev/firefuse/cv")) {
  app.use('/firerest/cv', express.static(cv_dir));
  console.log("Found FireFUSE!");
  console.log("Mapping /firerest/cv to: " + cv_dir);
} else {
  console.log("FireFUSE is not available. FireREST is demo mode only" );
}

var __appdir = "www";
app.use(express.static(__appdir));
console.log("Mapping / to: " + __appdir);
app.use(express.bodyParser());

var firerest_port=8001;
app.listen(firerest_port);
console.log('FireREST listening on port ' + firerest_port);
