var _ = require('lodash'),
    async = require('async'),
    program = require('commander');

// Pre-set environment variables take precedence
var env = _.defaults(process.env, { TZ: 'UTC' });

// Parse Command Line Arguments
program.version('0.0.1');
var options = [
  { short: 'H', long: 'host', args: '<name>', description: 'host name' },
  { short: 'S', long: 'serial', args: '<port>', description: 'serial port name (e.g. COM4)' },
  { short: 'E', long: 'email', args: '<email>', description: 'email address' },
  { short: 'P', long: 'pass', args: '<password>', description: 'password' } // Using "password" for the option name does not work
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
_.extend(env, _.pick(program, _.pluck(options, 'long')));

// Prompts are the last means of setting environment variables
var defaults = {
  host: 'http://localhost:3000',
  serial: 'COM4'
};

async.series(
  _.map(['host', 'serial', 'email', 'pass'], function (option) {
    return function (next) {
      if (env[option]) return next();

      // Option was neither in the command line arguments nor in a configuration file
      var action = 'prompt';
      var args = [option + ': '];
      if (option === 'pass') {
        action = 'password';
        args.push('*');
      }
      args.push(function (result) {
        env[option] = (result ? result : defaults[option]);
        return next();
      });
      program[action].apply(program, args);
    };
  }),
  function (error) {
    next(error);
    connect();
  }
);

function connect() {
  // Initialize Server
  var socket = require('socket.io-client').connect(env.host);
  socket.on('error', next);
  socket.on('connect', function () {
    console.log('socket connected');

    socket.emit('create:session', { data: { email: env.email, password: env.pass } }, function (error, data) {
      next(error);
      initSerialPort(socket);
    });
  });
  socket.on('disconnect', function () {
    console.log('socket disconnected');
  });
}

function initSerialPort(socket) {
  // Initialize Serial Port
  console.log('initializing serial port')
  var SerialPort = require('serialport').SerialPort;
  var serialPort = new SerialPort(env.serial, {
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: false
  });

  serialPort.on('error', next);

  console.log('serial port initialized');

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
      socket.emit('message', { data: message });
      console.log(message);
    }
  });
}

function next(error) {
  if (error) {
    console.error(error.stack || error);
    process.exit(1);
  }
}
