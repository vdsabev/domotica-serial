var _ = require('lodash');
_.defaults(process.env, {
  TZ: 'UTC',
  PORT: 'COM4'
});
