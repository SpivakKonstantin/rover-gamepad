var express = require('express'),
  http = require('http'),
  path = require('path'),
  async = require('async'),
  gpio = require('pi-gpio'),
  Pca9685Driver = require("pca9685").Pca9685Driver,
  app = express();

//set the port
app.set('port', process.env.PORT || 3000);

//serve static files from /static directory
app.use(express.static(path.join(__dirname, '/static')));

//create the server
var http = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

//init socket.io
var io = require('socket.io')(http);


var tank = {

  //assign pin numbers to variables for later use
  // motors: {
  //   leftFront: 11,
  //   leftBack: 12,
  //   rightFront: 15,
  //   rightBack: 16
  // },

  init: function(){
    var i2cBus = require("i2c-bus");
    pwm = new Pca9685Driver({
      i2c: i2cBus.openSync(1),
      address: 0x40,
      frequency: 50,
      debug: false
    }, function() {
      console.log("Initialization done");
    });
  },

  //for moving forward we power both motors  
  moveForward: function(left, right){
      if(left != 'undefined'){
          forvardTmpL = parseInt(left);
          forvardTmpR = parseInt(right);
      }else {
          forvardTmpL = 1700;
          forvardTmpR = 1700;
      }

    async.parallel([
      pwm.setPulseLength(5, forvardTmpL),
      pwm.setPulseLength(6, forvardTmpR),
    ]);
  },

  //for moving backward we power both motors but in backward mode
  moveBackward: function(){
    async.parallel([
      //console.log('back'),
      pwm.setPulseLength(5, 1300),
      pwm.setPulseLength(6, 1300)
    ]);
  },

  //for turning right we power the left motor 
  moveLeft: function(){
    async.parallel([
      //console.log('left'),
      pwm.setPulseLength(5, 1700),
      pwm.setPulseLength(6, 1300),
    ]);
  },

  //for turning left we power the right motor
  moveRight: function(){
    async.parallel([
      //console.log('right'),
      pwm.setPulseLength(5, 1300),
      pwm.setPulseLength(6, 1700),
    ]);
  },

  //stop both motors in all directions 
  stop: function(){

    async.parallel([
      console.log('stop'),
      pwm.setPulseLength(5, 1500),
      pwm.setPulseLength(6, 1500),
    ]);
  }
};
var previosDirection = null;
//listen for socket connection
io.sockets.on('connection', function(socket) {
  //listen for move signal
    socket.on('gamepad', function(direction) {

        if(direction.type == 'up'){
            //console.log('type: ' + direction.axis);
            tank.moveForward(direction.left, direction.right);
            previosDirection = 'up';
        }
        if(direction.type == 'down'){
            tank.moveForward(direction.left, direction.right);
            previosDirection = 'down';
        }
        if(direction.type == 'left'){
            tank.moveLeft();
            previosDirection = 'left';
        }
        if(direction.type == 'right'){
            tank.moveRight();
            previosDirection = 'right';
        }
    })


  socket.on('move', function(direction) {

    switch(previosDirection){
      case 'up':
        tank.moveBackward();
        break;
    }


    // switch(direction){
    //  case 'up':
    //     tank.moveForward();
    //     break;
    //   case 'down':
    //     tank.moveBackward();
    //     break;
    //   case 'right':
    //     tank.moveLeft();
    //     break;
    //   case 'left':
    //     tank.moveRight();
    //     break;
    // }
     previosDirection = direction;
  });

    socket.on('disconnect', function(){
        tank.stop();

        console.log('disconect');
    });
  //listen for stop signal
  socket.on('stop', function(dir){
    console.log('previos: '+previosDirection)
    if(previosDirection == 'up'){
      setTimeout(function () {
        tank.moveBackward()
      }, 50);
      setTimeout(function () {
        tank.stop()
      }, 100);
    }else {
      tank.stop();
    }

    if(previosDirection == 'left'){
      setTimeout(function () {
        pwm.setPulseLength(6, 1300);
      }, 50);
      setTimeout(function () {
        tank.stop()
      }, 100);
    }else {
      tank.stop();
    }



    if(previosDirection == 'right'){
      setTimeout(function () {
        pwm.setPulseLength(5, 1300);
      }, 50);
      setTimeout(function () {
        tank.stop()
      }, 100);
    }else {
      tank.stop();
    }


  });
});
/**
 * логика если заднее колесо было назад, то переключать ненадо. если вперед то переключить. вся логика, и
 * в таком ключе всегда ровер будет готов поехать назад
 */

tank.init();
