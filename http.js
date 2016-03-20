/*

HACKATHON PROJECT

This was a Tessel hackathon project where we were presented with a tessel which included a climate and servo module.
The general idea of this program is that a cup of coffee was placed in the cupholder built. The cupholder touched the climate module to measure the temperature. If a request was sent via our web-app and the temperature was too hot, the tessel started the servo module to commence the stirring of the coffee. 

When the appropriate temperature is reached, the servo stops stirring, and initiates an http request to the web app (which then proceeded to text the user that their coffee was ready).

To run the tessel, connect to the internet and type 'tessel http.js'

*/

// Tessel IP IS 192.168.2.201 locally for hackathon

var http = require('http');
var server = http.createServer();
var tessel = require('tessel');
var servolib = require('servo-pca9685');
var servo = servolib.use(tessel.port['C']);
var climatelib = require('climate-si7020');
var climate = climatelib.use(tessel.port['B']);
var stirInterval, climInterval, stirConfiguration, climConfig, climReady, servoReady, 
    servo1 = 1, //the position on the tessel module
    status = '',
    port = 1337,
    position = 0; //  Target position of the servo between 0 (min) and 1 (max).

server.on('request', function(req, res) {
    if (req.url === '/') {
        //check if servo and climate are ready. If so start climate config
        if (climReady && servoReady) {
            climConfig();
        }
        res.end();
    }
});

stirConfiguration = function() {
    servo.configure(servo1, 0.05, 0.3, function() {
        stirInterval = setInterval(function() {
            //  Set servo to position pos.
            servo.move(servo1, position);

            position += 1;
            if (position > 1) {
                position = 0;
            }
        }, 750);
    });
};

climConfig = function() {
    climInterval = setInterval(function() {
        climate.readTemperature('f', function(err, temp) {
            //arbitrary temperature chosen for demonstration
            if (temp < 90) {
                //if the temperature is cool enough clear all intervals (including this one) and set stirInterval to null for future requests
                clearInterval(stirInterval);
                clearInterval(climInterval);
                stirInterval = null;
                // console.log('READY and temp is ', temp.toFixed(2));

                //send http request to webapp to notify it that the coffee is ready
                http.get("http://192.168.1.166:1337/ready");
            } else {

                //if the temperature checked is too hot, determine if the servo is stirring, if not start stirring
                stirInterval ? "" : stirConfiguration();
                // console.log('Temp is ', temp.toFixed(2));
            }
        });
    }, 1000);

};
servo.on('ready', function() {
    server.listen(port, function() {
        console.log('Server listening at port: ', port);
    });
    servoReady = true;
});

climate.on('ready', function() {
    climReady = true;
});

climate.on('error', function(err) {
    console.log('error connecting module', err);
});