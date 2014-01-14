/* global describe, it */

var equal = require('../support/equal');

describe('Data Expressions', function () {
  it('should compile data expressions', function () {
    equal('<div>{{@test}}</div>', {}, {
      data: {
        test: 'some data'
      }
    })('<div>some data</div>');
  });
});
