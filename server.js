// Setup Environment
var _ = require('lodash'),
    program = require('commander');

// Set Default Values
_.defaults(process.env, {
  TZ: 'UTC',
  host: 'localhost',
  port: 8000,
  serial: 'COM4'
});

// Parse Command Line Arguments
program.version('0.0.1');
var options = [
  { short: 'h', long: 'host', description: 'host name' },
  { short: 'p', long: 'port', description: 'host port' },
  { short: 's', long: 'serial', description: 'serial port name (e.g. COM4)' }
];
options.forEach(function (option) {
  program.option('-' + option.short + ' --' + option.long, option.description);
});
program.parse(process.argv);

// Command Line Arguments take precedence
process.env = _.defaults(_.pick(program, _.pluck(options, 'long')), process.env);

// Initialize Server
var socket = require('socket.io-client').connect(process.env.host, { port: process.env.port });
socket.on('connect', function () {
  console.log('socket connected');
});
socket.on('disconnect', function () {
  console.log('socket disconnected');
});

// Initialize Serial Port
var serialPort = new require('serialport').SerialPort(process.env.serial, {
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  flowControl: false
});

// Process Data
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
    socket.emit('message', message);
    console.log(message);
  }
});
