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

var cleanData = '';
var readData = '';
serialPort.on('data', function (data) {
  readData += data.toString();
  if (readData.indexOf('{') !== -1 && readData.indexOf('}') !== -1) {
    cleanData = readData.substring(readData.indexOf('{') + 1, readData.indexOf('}'));
    readData = '';
    io.sockets.emit('message', cleanData);
    console.log(cleanData);
	}
});
