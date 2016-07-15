'use strict';

var Crash = require('../lib/main');
new Crash({
  actions: ['http'],
  actionHttpUrl: 'http://localhost:3000/?api_key=123',
  actionHttpMethod: 'POST',
  actionHttpTags: ['foo', 'bar'],
  actionHttpNameId: 'foo-bar'
});

const a = 1;

console.log(b);
