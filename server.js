var SerialPort  = require('serialport').SerialPort;
var portName = 'COM4';

var io = require('socket.io').listen(8000);
var serialPort = new SerialPort(portName, {
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  flowControl: false
});

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
  if (buffer.indexOf('{') >= 0 && buffer.indexOf('}') >= 0) {
    var message = buffer.substring(buffer.indexOf('{') + 1, buffer.indexOf('}'));
    buffer = '';
    io.sockets.emit('message', message);
    console.log(message);
	}
});
