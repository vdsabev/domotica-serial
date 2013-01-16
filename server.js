require('./env');

var _ = require('lodash'),
    SerialPort  = require('serialport').SerialPort;

var serialPort = new SerialPort(process.env.PORT, {
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  flowControl: false
});

var io = require('socket.io').listen(8000);
io.sockets.on('connection', function (socket) {
    socket.on('message', function (message) {
      console.log(message);
    });
    socket.on('disconnect', function () {
      console.log('disconnected');
    });
});

var buffer = '';
serialPort.on('data', function (data) {
  buffer += data.toString();
  var startIndex = buffer.indexOf('['),
      endIndex = buffer.indexOf(']');
  if (startIndex >= 0 && endIndex >= 0) {
    var message = buffer.substring(startIndex + 1, endIndex).split(',');
    buffer = buffer.substring(endIndex + 1);
    for (var i = message.length - 1; i >= 0; i--) {
      message[i] = parseInt(message[i]);
      if (isNaN(message[i])) {
        console.error('Invalid data: ', message);
        return;
      }
    }
    io.sockets.emit('message', message);
    console.log(message);
  }
});
