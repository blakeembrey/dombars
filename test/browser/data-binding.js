/* global describe, it, sinon, DOMBars, expect */

var equal = require('../support/update-equal');

describe('Data Binding', function () {
  it('should update a single expression', function (done) {
    var update = equal('{{test}}', {
      test: 'testing'
    })('testing');

    return update('something else', {
      test: 'something else'
    }, done);
  });

  it('should update expressions beside text', function (done) {
    var update = equal('go {{test}}', {
      test: 'before'
    })('go before');

    return update('go after', {
      test: 'after'
    }, done);
  });

  it('should update multiple expressions', function (done) {
    var update = equal('{{one}} {{two}}', {
      one: 'this',
      two: 'that'
    })('this that');

    return update('that this', {
      one: 'that',
      two: 'this'
    }, done);
  });

  it('should update multiple matching expressions', function (done) {
    var update = equal('{{test}} {{test}}', {
      test: 'before'
    })('before before');

    return update('after after', {
      test: 'after'
    }, done);
  });

  it('should update expressions in an element', function (done) {
    var update = equal('<div>{{test}}</div>', {
      test: 'before'
    })('<div>before</div>');

    return update('<div>after</div>', {
      test: 'after'
    }, done);
  });

  it('should update un-escaped expressions in an element', function (done) {
    var update = equal('<div>{{{test}}}</div>', {
      test: 'before'
    })('<div>before</div>');

    return update('<div>after</div>', {
      test: 'after'
    }, done);
  });

  it('should update attribute values', function (done) {
    var update = equal('<div class="{{test}}"></div>', {
      test: 'before'
    })('<div class="before"></div>');

    return update('<div class="after"></div>', {
      test: 'after'
    }, done);
  });

  it('should update attribute values with text', function (done) {
    var update = equal('<div class="test {{test}} more"></div>', {
      test: 'before'
    })('<div class="test before more"></div>');

    return update('<div class="test after more"></div>', {
      test: 'after'
    }, done);
  });

  it('should update attribute names', function (done) {
    var update = equal('<div {{test}}="test"></div>', {
      test: 'before'
    })('<div before="test"></div>');

    return update('<div after="test"></div>', {
      test: 'after'
    }, done);
  });

  it('should update attribute names with text', function (done) {
    var update = equal('<div attribute-{{test}}="test"></div>', {
      test: 'before'
    })('<div attribute-before="test"></div>');

    return update('<div attribute-after="test"></div>', {
      test: 'after'
    }, done);
  });

  it('should update tag names', function (done) {
    var update = equal('<{{test}} class="test"></{{test}}>', {
      test: 'before'
    })('<before class="test"></before>');

    return update('<after class="test"></after>', {
      test: 'after'
    }, done);
  });

  it('should update tag names with text', function (done) {
    var update = equal('<tag-{{test}} class="test"></tag-{{test}}>', {
      test: 'before'
    })('<tag-before class="test"></tag-before>');

    return update('<tag-after class="test"></tag-after>', {
      test: 'after'
    }, done);
  });

  it('should update helpers', function (done) {
    var update = equal('{{helper test}}', {
      test: 'before'
    }, {
      helpers: {
        helper: function (test) {
          return 'helper ' + test;
        }
      }
    })('helper before');

    return update('helper after', {
      test: 'after'
    }, done);
  });

  it('should update block helpers', function (done) {
    var update = equal(
      '{{#helper test}}block helper {{value}}{{/helper}}',
      {
        test: 'before'
      },
      {
        helpers: {
          helper: function (value, options) {
            return options.fn({
              value: value
            });
          }
        }
      }
    )('block helper before');

    return update('block helper after', {
      test: 'after'
    }, done);
  });

  it('should update nested block helpers', function (done) {
    var update = equal('{{#test}}{{more}}{{/test}}', {
      test: {
        more: 'racecar'
      }
    })('racecar');

    return update('', {
      test: false
    }, done);
  });

  it('should update comment nodes', function (done) {
    var update = equal('<!-- {{test}} -->', {
      test: 'before'
    })('<!-- before -->');

    return update('<!-- after -->', {
      test: 'after'
    }, done);
  });

  it('should update comment nodes with text', function (done) {
    var update = equal('<!-- something {{test}} more -->', {
      test: 'before'
    })('<!-- something before more -->');

    return update('<!-- something after more -->', {
      test: 'after'
    }, done);
  });

  it('should update everything together', function (done) {
    var update = equal(
      '<tag-{{tag}} attr-{{attr}}="content {{value}}" ' +
      'another-{{attr}}="more {{value}}">{{text}} text {{text}}' +
      '</tag-{{tag}}>',
      {
        tag: 'something',
        attr: 'else',
        value: 'here',
        text: 'content'
      }
    )(
      '<tag-something attr-else="content here" ' +
      'another-else="more here">content text content' +
      '</tag-something>'
    );

    return update(
      '<tag-again attr-more="content attribute" ' +
      'another-more="more attribute">text text text' +
      '</tag-again>',
      {
        tag: 'again',
        attr: 'more',
        value: 'attribute',
        text: 'text'
      },
      done
    );
  });

  it('should update conditional block helpers', function (done) {
    var update = equal('tis {{#if test}}true{{else}}false{{/if}}', {
      test: true
    })('tis true');

    return update('tis false', {
      test: false
    }, done);
  });

  it('should call unsubscriptions when branch is dropped', function (done) {
    var spy = sinon.spy();

    DOMBars.registerHelper('helper', function (options) {
      options.unsubscribe(spy);
      return 'helper';
    });

    var update = equal('{{#test}}{{helper}}{{/test}}', {
      test: true
    })('helper');

    return update('', {
      test: false
    }, function (err) {
      expect(spy).to.have.been.calledOnce;

      return done(err);
    });
  });
});
