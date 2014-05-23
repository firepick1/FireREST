console.log("loading express...");
var express = require('express');
var fs = require('fs');
var app = express();

app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

// By default, use reference implementation
var __appdir = "www";
app.use(express.static(__appdir));
console.log("Mapping / to: " + __appdir);
app.use(express.bodyParser());

// If possible, use FireFUSE
console.log("Looking for FireFUSE...");
var cv_dir = "/dev/firefuse/cv";
if (fs.existsSync(cv_dir)) {
  app.use('/firerest/cv', express.static(cv_dir));
  app.get('/firerest/config.json', function(req,res) {
    res.sendfile('/dev/firefuse/config.json');
  });
  console.log("Found FireFUSE!");
  console.log("Mapping /firerest/cv to: " + cv_dir);
} else {
  console.log("FireFUSE is not available. FireREST is demo mode only" );
}

var firerest_port=8001;
app.listen(firerest_port);
console.log('FireREST listening on port ' + firerest_port);
