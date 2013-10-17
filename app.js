var _ = require('lodash'),
    async = require('async'),
    io = require('socket.io-client'),
    program = require('commander'),
    serialport = require('serialport'),
    Table = require('cli-table');

// Pre-set environment variables take precedence
var env = _.defaults({}, process.env, { TZ: 'UTC' });

// Parse Command Line Arguments
program.version('0.0.1');
var options = [
  { short: 'S', long: 'serial', args: '<ports>', description: 'serial port names (comma-separated, e.g. COM4,COM5)' },
  { short: 'H', long: 'host', args: '<name>', description: 'host name' },
  { short: 'E', long: 'email', args: '<address>', description: 'email address' },
  { short: 'P', long: 'pass', args: '<word>', description: 'password' } // Using "password" for the option name does not work
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
  serial: 'COM4',
  host: 'http://localhost:3000'
};

// Utility functions
String.prototype.repeat = function (count) {
  return new Array(count + 1).join(this);
};

async.series(
  _.map(_.pluck(options, 'long'), function (option) {
    return function (next) {
      if (env[option]) return next(); // Option was either in the command line arguments or in a configuration file

      if (option === 'serial') {
        serialport.list(function (error, ports) {
          if (error) return next(error);
          if (ports.length === 0) return next('no serial ports detected!');

          console.log('%d serial ports detected:', ports.length);
          var table = new Table({ head: ['Name', 'PnP ID', 'Manufacturer'] });
          _.each(ports, function (port) {
            table.push([port.comName, port.pnpId, port.manufacturer]);
          });
          console.log(table.toString());
          prompt();
        });
      }
      else {
        prompt();
      }

      function prompt() {
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
      }
    };
  }),
  function (error) {
    next(error);

    // Parse options
    _.each(_.pluck(options, 'long'), function (option) {
      if (option === 'serial') {
        env[option] = env[option].split(/\s*,\s*/);
      }
    });

    connect();
  }
);

function connect() {
  // Initialize Server
  console.log('connecting to %s...', env.host);
  var server = io.connect(env.host);
  server.on('error', next);
  server.on('connect', function () {
    console.log('...connected to %s...', env.host);
    server.emit('create:session', { data: { email: env.email, password: env.pass } }, function (error, data) {
      next(error);
      initSerialPorts(server);
    });
  });
  server.on('disconnect', function () {
    console.log('...disconnected from %s', env.host);
  });
}

function initSerialPorts(server) {
  // Initialize Serial Port
  console.log('initializing serial ports...')
  _.each(env.serial, function (portName) {
    console.log('initializing %s...', portName)

    var port = new serialport.SerialPort(portName, {
      baudRate: 9600,
      dataBits: 8,
      parity: 'none',
      stopBits: 1,
      flowControl: false
    });

    port.on('error', next);

    console.log('...initialized %s', portName);

    // Process Data
    var buffer = '';
    port.on('data', function (data) {
      buffer += data.toString();
      var startIndex = buffer.indexOf('['),
          endIndex = buffer.indexOf(']');
      if (0 <= startIndex && startIndex < endIndex) {
        var values = buffer.substring(startIndex + 1, endIndex).split(/\s*,\s*/);
        buffer = buffer.substring(endIndex + 1);
        _.each(values, function (value, index) {
          values[index] = isNaN(value) ? null : parseInt(value);
        });
        server.emit('message', { data: values });
        console.log(portName, '->', values);
      }
    });
  });

  console.log('...initialized serial ports');
}

function next(error) {
  if (error) {
    console.error(error.stack || error);
    process.exit(1);
  }
}
