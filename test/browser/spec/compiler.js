/* global describe, it */

describe('Compiler', function () {
  var fixture = document.getElementById('fixture');

  it('should exist', function () {
    expect(DOMBars.precompile).to.exist;
    expect(DOMBars.compile).to.exist;
    expect(DOMBars.Compiler).to.exist;
    expect(DOMBars.JavaScriptCompiler).to.exist;
  });

  describe('Compiling Templates', function () {
    afterEach(function () {
      fixture.innerHTML = '';
    });

    it('should compile text', function () {
      fixture.appendChild(DOMBars.compile('testing')());
      expect(fixture.innerHTML).to.equal('testing');
    });

    it('should compile expressions', function () {
      var template = DOMBars.compile('{{test}}')({
        test: 'testing'
      });
      fixture.appendChild(template);
      expect(fixture.innerHTML).to.equal('testing');
    });

    describe('Text and Expressions', function () {
      it('should compile text before expressions', function () {
        var template = DOMBars.compile('test {{test}}')({
          test: 'again'
        });
        fixture.appendChild(template);
        expect(fixture.innerHTML).to.equal('test again');
      });

      it('should compile text after expressions', function () {
        var template = DOMBars.compile('{{test}} test')({
          test: 'another'
        });
        fixture.appendChild(template);
        expect(fixture.innerHTML).to.equal('another test');
      });

      it('should compile text before and after expressions', function () {
        var template = DOMBars.compile('one {{test}} test')({
          test: 'more'
        });
        fixture.appendChild(template);
        expect(fixture.innerHTML).to.equal('one more test');
      });

      it('should compile expressions before and after text', function () {
        var template = DOMBars.compile('{{before}} another {{after}}')({
          before: 'yet',
          after: 'test'
        });
        fixture.appendChild(template);
        expect(fixture.innerHTML).to.equal('yet another test');
      });
    });

    describe('Comment Nodes', function () {
      it('should compile text', function () {
        fixture.appendChild(DOMBars.compile('<!-- test -->')());
        expect(fixture.innerHTML).to.equal('<!-- test -->');
      });

      it('should compile expressions', function () {
        var template = DOMBars.compile('<!-- {{test}} -->')({
          test: 'test'
        });
        fixture.appendChild(template);
        expect(fixture.innerHTML).to.equal('<!-- test -->');
      });

      it('should compile expressions and text', function () {
        var template = DOMBars.compile('<!-- test {{mixing}} content -->')({
          mixing: 'more'
        });
        fixture.appendChild(template);
        expect(fixture.innerHTML).to.equal('<!-- test more content -->');
      });
    });

    describe('Element Nodes', function () {
      it('should compile text', function () {
        fixture.appendChild(DOMBars.compile('<div></div>')());
        expect(fixture.innerHTML).to.equal('<div></div>');
      });

      it('should compile expressions', function () {
        var template = DOMBars.compile('<{{test}}></{{test}}>')({
          test: 'div'
        });
        fixture.appendChild(template);
        expect(fixture.innerHTML).to.equal('<div></div>');
      });

      it('should compile expressions and text', function () {
        var template = DOMBars.compile('<{{test}}-tag></{{test}}-tag>')({
          test: 'custom'
        });
        fixture.appendChild(template);
        expect(fixture.innerHTML).to.equal('<custom-tag></custom-tag>');
      });

      describe('Attributes', function () {
        it('should compile text', function () {
          fixture.appendChild(DOMBars.compile('<div class="test"></div>')());
          expect(fixture.innerHTML).to.equal('<div class="test"></div>');
        });

        it('should compile expressions in the attribute value', function () {
          var template = DOMBars.compile('<div class="{{test}}"></div>')({
            test: 'value'
          });
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal('<div class="value"></div>');
        });

        it('should compile expressions in the attribute name', function () {
          var template = DOMBars.compile('<div {{test}}="value"></div>')({
            test: 'attribute'
          });
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal('<div attribute="value"></div>');
        });

        it('should keep attributes in the same order as defined', function () {
          var template = DOMBars.compile(
            '<div some="here" attribute="there"></div>'
          )();
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal(
            '<div some="here" attribute="there"></div>'
          );
        });

        it('should compile expressions and text in the attribute value', function () {
          var template = DOMBars.compile(
            '<div class="some {{test}} here"></div>'
          )({
            test: 'class'
          });
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal(
            '<div class="some class here"></div>'
          );
        });

        it('should compile expressions and text in the attribute name', function () {
          var template = DOMBars.compile(
            '<div some-{{test}}-here="test"></div>'
          )({
            test: 'attribute'
          });
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal(
            '<div some-attribute-here="test"></div>'
          );
        });
      });

      describe('Children', function () {
        it('should compile text', function () {
          fixture.appendChild(DOMBars.compile('<div>test</div>')());
          expect(fixture.innerHTML).to.equal('<div>test</div>');
        });

        it('should compile expressions', function () {
          var template = DOMBars.compile('<div>{{test}}</div>')({
            test: 'test content'
          });
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal('<div>test content</div>');
        });

        it('should compile text and expressions', function () {
          var template = DOMBars.compile('<div>some {{test}} here</div')({
            test: 'content'
          });
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal('<div>some content here</div>');
        });

        it('should compile child elements', function () {
          var template = DOMBars.compile('<div><div></div></div>')();
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal('<div><div></div></div>');
        });

        it('should compile child elements and text', function () {
          var template = DOMBars.compile('<div>test <div></div></div>')();
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal('<div>test <div></div></div>');
        });

        it('should compile child elements, text and expressions', function () {
          var template = DOMBars.compile(
            '<div>test <div></div> {{test}}</div>'
          )({
            test: 'expression'
          });
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal(
            '<div>test <div></div> expression</div>'
          );
        });

        it('should compile unescaped expressions', function () {
          var template = DOMBars.compile('<div>{{{test}}}</div>')({
            test: '<div></div>'
          });
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal('<div><div></div></div>');
        });

        it('should compile unescaped text expressions', function () {
          var template = DOMBars.compile('<div>{{{test}}}</div>')({
            test: 'text'
          });
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal('<div>text</div>');
        });

        it('should not compile escape expressions', function () {
          var template = DOMBars.compile('<div>{{test}}</div>')({
            test: '<div></div>'
          });
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal(
            '<div>&lt;div&gt;&lt;/div&gt;</div>'
          );
        });

        it('should compile elements back in escaped expressions', function () {
          var template = DOMBars.compile('<div>{{test}}</div>')({
            test: document.createElement('div')
          });
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal(
            '<div>&lt;div&gt;&lt;/div&gt;</div>'
          );
        });
      });

      describe('SafeString', function () {
        it('should domify a safe string', function () {
          var template = DOMBars.compile('<div>{{test}}</div>')({
            test: new DOMBars.SafeString('<div></div>')
          });
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal('<div><div></div></div>');
        });

        it('should function as usual with an unescaped mustache', function () {
          var template = DOMBars.compile('<div>{{{test}}}</div>')({
            test: new DOMBars.SafeString('<div></div>')
          });
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal('<div><div></div></div>');
        });
      });

      describe('Data Expressions', function () {
        it('should compile data expressions', function () {
          var template = DOMBars.compile('<div>{{@test}}</div>')({}, {
            data: {
              test: 'some data'
            }
          });

          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal('<div>some data</div>');
        });
      });

      describe('Comment Expression', function () {
        it('should not output comment nodes in the template', function () {
          var template = DOMBars.compile('<div>{{! comment }}</div>')();
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal('<div></div>');
        });

        it('should not output comment nodes beside text', function () {
          var template = DOMBars.compile('<div>text {{! comment }}</div>')();
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal('<div>text </div>');
        });
      });

      describe('Helpers', function () {
        describe('Built-in Helpers', function () {
          it('should work with the each helper', function () {
            var template = DOMBars.compile(
              '<ul>{{#each test}}<li>{{@index}} {{.}}</li>{{/each}}</ul>'
            )({
              test: ['this', 'that', 'another thing']
            });

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal(
              '<ul><li>0 this</li><li>1 that</li><li>2 another thing</li></ul>'
            );
          });

          it('should work with the if helper', function () {
            var template = DOMBars.compile(
              '{{#if test}}<div></div>{{else}}<span></span>{{/if}}'
            )({
              test: true
            });

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('<div></div>');
          });

          it('should work with the unless helper', function () {
            var template = DOMBars.compile(
              '{{#unless test}}<div></div>{{else}}<span></span>{{/unless}}'
            )({
              test: false
            });

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('<div></div>');
          });

          it('should work with the with helper', function () {
            var template = DOMBars.compile(
              '{{#with test.nested}}<span>I know {{value}}</span>{{/with}}'
            )({
              test: {
                nested: {
                  value: 'something goes here'
                }
              }
            });

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal(
              '<span>I know something goes here</span>'
            );
          });
        });

        describe('User-defined Helpers', function () {
          it('should work with user-defined helpers that returns strings', function () {
            var template = DOMBars.compile('{{test}}')({}, {
              helpers: {
                test: function (options) {
                  return '<div></div>'
                }
              }
            });

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('&lt;div&gt;&lt;/div&gt;');
          });

          it('should work with user-defined helpers that return safe strings', function () {
            var template = DOMBars.compile('{{test}}')({}, {
              helpers: {
                test: function (options) {
                  return new DOMBars.SafeString('<div></div>');
                }
              }
            });

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('<div></div>');
          });

          it('should work with user-defined block helpers', function () {
            var template = DOMBars.compile('{{#test}}content{{/test}}')({}, {
              helpers: {
                test: function (options) {
                  var el = document.createElement('span');
                  el.appendChild(options.fn());
                  return el;
                }
              }
            });

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('<span>content</span>');
          });
        });
      });

      describe('Block Expressions', function () {
        it('should compile block helpers', function () {
          var template = DOMBars.compile('{{#test}}text{{/test}}')({
            test: true
          });
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal('text');
        });

        it('should compile block helpers with DOM nodes', function () {
          var template = DOMBars.compile('{{#test}}<div></div>{{/test}}')({
            test: true
          });
          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal('<div></div>');
        });

        it('should compile deeply nested block helpers', function () {
          var template = DOMBars.compile(
            '<div>{{#test}}<span>{{#again}}{{more}}{{/again}}</span>{{/test}}</div>'
          )({
            test: {
              again: {
                more: 'test'
              }
            }
          });

          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal(
            '<div><span>test</span></div>'
          );
        });

        it('should work with else block helpers', function () {
          var template = DOMBars.compile(
            '{{#test}}<div></div>{{else}}<span></span>{{/test}}'
          )({ test: false });

          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal('<span></span>');
        });
      });

      describe('Data Binding', function () {
        describe('Expressions', function () {
          var clock;

          beforeEach(function () {
            var i = 0;

            // Custom subscription method.
            DOMBars.subscribe = function (object, property, fn) {
              setTimeout(function () {
                i++; // Increment the subscription counter.
                fn();
              }, 100);
            };

            // Custom getter method.
            DOMBars.get = function (object, property) {
              return i ? 'after' : 'before';
            };

            clock = sinon.useFakeTimers();
          });

          afterEach(function () {
            clock.restore();
            DOMBars.subscribe = function () {};
          });

          it('should re-render a single expression', function () {
            var template = DOMBars.compile('{{test}}')();

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('before');

            clock.tick(100);

            expect(fixture.innerHTML).to.equal('after');
          });

          it('should re-render expression beside text', function () {
            var template = DOMBars.compile('go {{test}}')();

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('go before');

            clock.tick(100);

            expect(fixture.innerHTML).to.equal('go after');
          });

          it('should re-render multiple expressions', function () {
            var template = DOMBars.compile('{{test}} {{test}}')();

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('before before');

            clock.tick(100);

            expect(fixture.innerHTML).to.equal('after after');
          });

          it('should working inside an element', function () {
            var template = DOMBars.compile('<div>{{test}}</div>')();

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('<div>before</div>');

            clock.tick(100);

            expect(fixture.innerHTML).to.equal('<div>after</div>');
          });
        });
      });
    });
  });
});
