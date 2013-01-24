// Setup Environment
var _ = require('lodash'),
    async = require('async'),
    program = require('commander');

// Set Default Values
_.defaults(process.env, { TZ: 'UTC', fake: false });

// Parse Command Line Arguments
program.version('0.0.1');
var options = [
  { short: 'H', long: 'host', args: '<host>', description: 'host name' },
  { short: 'P', long: 'port', args: '<port>', description: 'serial port name (e.g. COM4)' },
  { short: 'S', long: 'system', args: '<system>', description: 'system name' },
  { short: 'K', long: 'key', args: '<key>', description: 'system key' },
  { short: 'F', long: 'fake', description: 'fake data by sending random numbers' }
];
options.forEach(function (option) {
  program.option(
    '-' + option.short +
    (option.long ? ' --' + option.long : '') +
    (option.args ? ' ' + option.args : ''),
    option.description
  );
});
program.parse(process.argv);

// Command Line Arguments take precedence
process.env = _.defaults(_.pick(program, _.pluck(options, 'long')), process.env);

// Prompts are the last means of setting environment variables
var defaults = {
  host: 'http://localhost:8000',
  port: 'COM4'
};

async.series(
  _.map(options, function (option) {
    return function (next) {
      if (process.env[option.long]) return next();

      // Option was neither in the command line arguments nor in a configuration file
      var action = 'prompt',
          args = [option.description + ': '];
      if (option.long === 'key') {
        action = 'password';
        args.push('*');
      }
      args.push(function (result) {
        process.env[option.long] = (result ? result : defaults[option.long]);
        return next();
      });
      program[action].apply(program, args);
    };
  }),
  function (error) {
    if (error) {
      console.error(error);
      process.exit(1);
    }

    connect();
  }
);

function connect() {
  // Initialize Server
  var server = process.env.host + '/?system=' + process.env.system + '&key=' + process.env.key;
  var socket = require('socket.io-client').connect(server);
  socket.on('connect', function () {
    console.log('socket connected');
  });
  socket.on('disconnect', function () {
    console.log('socket disconnected');
  });

  // Initialize Serial Port
  var SerialPort = require('serialport').SerialPort;
  var serialPort = new SerialPort(process.env.serial, {
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
}
