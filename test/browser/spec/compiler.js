/* global describe, it, expect, beforeEach, afterEach, sinon, DOMBars */

describe('Compiler', function () {
  var fixture       = document.getElementById('fixture');
  var prevGet       = DOMBars.get;
  var prevSubscribe = DOMBars.subscribe;
  var clock;

  it('should exist', function () {
    expect(DOMBars.precompile).to.exist;
    expect(DOMBars.compile).to.exist;
    expect(DOMBars.Compiler).to.exist;
    expect(DOMBars.JavaScriptCompiler).to.exist;
  });

  beforeEach(function () {
    clock = sinon.useFakeTimers();
  });

  afterEach(function () {
    clock.restore();
    DOMBars.get       = prevGet;
    DOMBars.subscribe = prevSubscribe;
  });

  describe('Compiling Templates', function () {
    afterEach(function () {
      fixture.innerHTML = '';
    });

    it('should compile text', function () {
      fixture.appendChild(DOMBars.compile('testing')());
      expect(fixture.innerHTML).to.equal('testing');
    });

    it('should correctly unescape text', function () {
      fixture.appendChild(DOMBars.compile('&amp;')());
      expect(fixture.innerHTML).to.equal('&amp;');
    });

    it('should compile expressions', function () {
      var template = DOMBars.compile('{{test}}')({
        test: 'testing'
      });

      fixture.appendChild(template);
      expect(fixture.innerHTML).to.equal('testing');
    });

    it('should compile simple paths', function () {
      var template = DOMBars.compile('{{test.nested.path}}')({
        test: {
          nested: {
            path: 'testing'
          }
        }
      });

      fixture.appendChild(template);
      expect(fixture.innerHTML).to.equal('testing');
    });

    it('should compile using segment-literal notation', function () {
      var template = DOMBars.compile('{{test.[#nested].[~path]}}')({
        test: {
          '#nested': {
            '~path': 'testing'
          }
        }
      });

      fixture.appendChild(template);
      expect(fixture.innerHTML).to.equal('testing');
    });

    it('should not escape text expressions', function () {
      var template = DOMBars.compile('{{test}}')({ test: '& \' "' });

      fixture.appendChild(template);
      expect(fixture.textContent).to.equal('& \' "');
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
          after:  'test'
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

      it('should not incorrectly reuse DOM nodes', function () {
        var template = DOMBars.compile(
          '<div>{{test}}</div><span>{{test}}</span>'
        )({
          test: 'text'
        });

        fixture.appendChild(template);
        expect(fixture.innerHTML).to.equal(
          '<div>text</div><span>text</span>'
        );
      });

      it('should not reuse attribute and non-attribute programs', function () {
        var template = DOMBars.compile(
          '<h1>{{title}}</h1><input value="{{title}}">'
        )({
          title: 'Test'
        });

        fixture.appendChild(template);
        expect(fixture.innerHTML).to.equal(
          '<h1>Test</h1><input value="Test">'
        );
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

        it(
          'should compile expressions and text in the attribute value',
          function () {
            var template = DOMBars.compile(
              '<div class="some {{test}} here"></div>'
            )({
              test: 'class'
            });

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal(
              '<div class="some class here"></div>'
            );
          }
        );

        it(
          'should compile expressions and text in the attribute name',
          function () {
            var template = DOMBars.compile(
              '<div some-{{test}}-here="test"></div>'
            )({
              test: 'attribute'
            });

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal(
              '<div some-attribute-here="test"></div>'
            );
          }
        );

        it('should interpret false as remove the attribute', function () {
          var template = DOMBars.compile(
            '<input type="checkbox" checked="{{{test}}}">'
          )({
            test: false
          });

          fixture.appendChild(template);
          expect(fixture.innerHTML).to.equal('<input type="checkbox">');
        });

        it('should not escape attributes with special characters', function () {
          var template = DOMBars.compile(
            '<div test="{{{test}}}"></div>'
          )({
            test: 'Test &\'"'
          });

          fixture.appendChild(template);
          expect(fixture.firstChild.tagName).to.equal('DIV');
          expect(fixture.firstChild.getAttribute('test')).to.equal('Test &\'"');
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
              '<ul>{{#each test}}<li>{{@index}} = {{.}}</li>{{/each}}</ul>'
            )({
              test: ['this', 'that', 'another thing']
            });

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal(
              '<ul>' +
                '<li>0 = this</li><li>1 = that</li><li>2 = another thing</li>' +
              '</ul>'
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

        describe('Expressions', function () {
          it('should refer to the parent scope', function () {
            var template = DOMBars.compile([
              '<h1>Comments</h1>',
              '',
              '<div id="comments">',
              '{{#each comments}}',
              '<h2><a href="/posts/{{../permalink}}#{{id}}">{{title}}</a></h2>',
              '<div>{{body}}</div>',
              '{{/each}}',
              '</div>'
            ].join('\n'))({
              permalink: 'comments',
              comments: [{
                id: 1,
                title: 'Test',
                body: 'Example comment'
              }, {
                id: 3,
                title: 'Again',
                body: 'Another comment'
              }]
            });

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal([
              '<h1>Comments</h1>',
              '',
              '<div id="comments">',
              '',
              '<h2><a href="/posts/comments#1">Test</a></h2>',
              '<div>Example comment</div>',
              '',
              '<h2><a href="/posts/comments#3">Again</a></h2>',
              '<div>Another comment</div>',
              '',
              '</div>'
            ].join('\n'));
          });
        });

        describe('User-defined Helpers', function () {
          it(
            'should work with user-defined helpers that returns strings',
            function () {
              var template = DOMBars.compile('{{test}}')({}, {
                helpers: {
                  test: function () {
                    return '<div></div>';
                  }
                }
              });

              fixture.appendChild(template);
              expect(fixture.innerHTML).to.equal('&lt;div&gt;&lt;/div&gt;');
            }
          );

          it(
            'should work with user-defined helpers that return safe strings',
            function () {
              var template = DOMBars.compile('{{test}}')({}, {
                helpers: {
                  test: function () {
                    return new DOMBars.SafeString('<div></div>');
                  }
                }
              });

              fixture.appendChild(template);
              expect(fixture.innerHTML).to.equal('<div></div>');
            }
          );

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
            '<div>{{#test}}' +
              '<span>{{#again}}{{more}}{{/again}}</span>' +
            '{{/test}}</div>'
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
            DOMBars.get = function () {
              return i ? 'after' : 'before';
            };
          });

          it('should update a single expression', function (done) {
            var template = DOMBars.compile('{{test}}')();

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('before');

            clock.tick(100);

            DOMBars.VM.exec(function () {
              expect(fixture.innerHTML).to.equal('after');
              return done();
            });
          });

          it('should update expression beside text', function (done) {
            var template = DOMBars.compile('go {{test}}')();

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('go before');

            clock.tick(100);

            DOMBars.VM.exec(function () {
              expect(fixture.innerHTML).to.equal('go after');
              return done();
            });
          });

          it('should update multiple expressions', function (done) {
            var template = DOMBars.compile('{{test}} {{test}}')();

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('before before');

            clock.tick(100);

            DOMBars.VM.exec(function () {
              expect(fixture.innerHTML).to.equal('after after');
              return done();
            });
          });

          it('should update inside an element', function (done) {
            var template = DOMBars.compile('<div>{{test}}</div>')();

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('<div>before</div>');

            clock.tick(100);

            DOMBars.VM.exec(function () {
              expect(fixture.innerHTML).to.equal('<div>after</div>');
              return done();
            });
          });

          it('should update un-escaped expressions', function (done) {
            var template = DOMBars.compile('<div>{{{test}}}</div>')();

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('<div>before</div>');

            clock.tick(100);

            DOMBars.VM.exec(function () {
              expect(fixture.innerHTML).to.equal('<div>after</div>');
              return done();
            });
          });

          it('should update attribute values', function (done) {
            var template = DOMBars.compile('<div class="{{test}}"></div>')();

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('<div class="before"></div>');

            clock.tick(100);

            DOMBars.VM.exec(function () {
              expect(fixture.innerHTML).to.equal('<div class="after"></div>');
              return done();
            });
          });

          it('should update attribute values with text', function (done) {
            var template = DOMBars.compile(
              '<div class="test {{test}}"></div>'
            )();

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal(
              '<div class="test before"></div>'
            );

            clock.tick(100);

            DOMBars.VM.exec(function () {
              expect(fixture.innerHTML).to.equal(
                '<div class="test after"></div>'
              );
              return done();
            });
          });

          it('should update attribute names', function (done) {
            var template = DOMBars.compile('<div {{test}}="attr"></div>')();

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('<div before="attr"></div>');

            clock.tick(100);

            DOMBars.VM.exec(function () {
              expect(fixture.innerHTML).to.equal('<div after="attr"></div>');
              return done();
            });
          });

          it('should update attribute names with text', function (done) {
            var template = DOMBars.compile(
              '<div some-{{test}}="attr"></div>'
            )();

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal(
              '<div some-before="attr"></div>'
            );

            clock.tick(100);

            DOMBars.VM.exec(function () {
              expect(fixture.innerHTML).to.equal(
                '<div some-after="attr"></div>'
              );
              return done();
            });
          });

          it('should update tag names', function (done) {
            var template = DOMBars.compile(
              '<{{test}} some="attr"></{{test}}>'
            )();

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('<before some="attr"></before>');

            clock.tick(100);

            DOMBars.VM.exec(function () {
              expect(fixture.innerHTML).to.equal('<after some="attr"></after>');
              return done();
            });
          });

          it('should update tag names with text', function (done) {
            var template = DOMBars.compile(
              '<tag-{{test}} some="attr"></tag-{{test}}>'
            )();

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal(
              '<tag-before some="attr"></tag-before>'
            );

            clock.tick(100);

            DOMBars.VM.exec(function () {
              expect(fixture.innerHTML).to.equal(
                '<tag-after some="attr"></tag-after>'
              );
              return done();
            });
          });

          it('should update simple helpers', function (done) {
            var template = DOMBars.compile(
              '{{helper test}}'
            )({}, {
              helpers: {
                helper: function (test) {
                  return 'helper ' + test;
                }
              }
            });

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('helper before');

            clock.tick(100);

            DOMBars.VM.exec(function () {
              expect(fixture.innerHTML).to.equal('helper after');
              return done();
            });
          });

          it('should update comment nodes', function (done) {
            var template = DOMBars.compile(
              '<!-- {{test}} -->'
            )();

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('<!-- before -->');

            clock.tick(100);

            DOMBars.VM.exec(function () {
              expect(fixture.innerHTML).to.equal('<!-- after -->');
              return done();
            });
          });

          it('should update everything together', function (done) {
            var template = DOMBars.compile(
              '<tag-{{test}} attr-{{test}}="content {{test}}" ' +
              'another-{{test}}="more {{test}}">{{test}} text {{test}}' +
              '</tag-{{test}}>'
            )();

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal(
              '<tag-before attr-before="content before" ' +
              'another-before="more before">before text before' +
              '</tag-before>'
            );

            clock.tick(100);

            DOMBars.VM.exec(function () {
              expect(fixture.innerHTML).to.equal(
                '<tag-after attr-after="content after" ' +
                'another-after="more after">after text after' +
                '</tag-after>'
              );
              return done();
            });
          });

          it('should update block helpers', function (done) {
            var template = DOMBars.compile(
              '{{#helper test}}{{value}}{{/helper}}'
            )({}, {
              helpers: {
                helper: function (value, options) {
                  return options.fn({
                    value: value
                  });
                }
              }
            });

            fixture.appendChild(template);
            expect(fixture.innerHTML).to.equal('before');

            clock.tick(100);

            DOMBars.VM.exec(function () {
              expect(fixture.innerHTML).to.equal('after');
              return done();
            });
          });
        });

        describe('Advanced Usage', function () {
          describe('Property Updates', function () {
            var i;

            var valueMap = {
              0: 'before',
              1: '',
              2: 'after'
            };

            beforeEach(function () {
              i = 0;

              DOMBars.get = function () {
                return valueMap[i++];
              };

              DOMBars.subscribe = function (obj, name, fn) {
                setTimeout(fn, 100);
              };
            });

            it('should be able to update input values', function (done) {
              var template = DOMBars.compile('<input value="{{test}}">')();

              fixture.appendChild(template);

              expect(fixture.innerHTML).to.equal('<input value="before">');
              expect(fixture.firstChild.value).to.equal('before');

              clock.tick(100);

              DOMBars.VM.exec(function () {
                expect(fixture.innerHTML).to.equal('<input value="">');
                expect(fixture.firstChild.value).to.equal('');

                clock.tick(100);

                DOMBars.VM.exec(function () {
                  expect(fixture.innerHTML).to.equal('<input value="after">');
                  expect(fixture.firstChild.value).to.equal('after');

                  return done();
                });
              });
            });

            it('should be able to update textarea values', function (done) {
              var template = DOMBars.compile('<textarea>{{test}}</textarea>')();

              fixture.appendChild(template);

              expect(fixture.innerHTML).to.equal('<textarea>before</textarea>');
              expect(fixture.firstChild.value).to.equal('before');

              clock.tick(100);

              DOMBars.VM.exec(function () {
                expect(fixture.innerHTML).to.equal('<textarea></textarea>');
                expect(fixture.firstChild.value).to.equal('');

                clock.tick(100);

                DOMBars.VM.exec(function () {
                  expect(fixture.innerHTML).to.equal(
                    '<textarea>after</textarea>'
                  );
                  expect(fixture.firstChild.value).to.equal('after');

                  return done();
                });
              });

            });
          });

          describe('Boolean Switch', function () {
            beforeEach(function () {
              DOMBars.subscribe = function (obj, name, fn) {
                if (name !== 'test') { return; }

                obj[name] = !obj[name];
                setTimeout(fn, 100);
              };
            });

            it('should update nested helpers', function (done) {
              var template = DOMBars.compile(
                '{{#test}}{{more}}{{/test}}'
              )({
                test: {
                  more: 'racecar'
                }
              });

              fixture.appendChild(template);
              expect(fixture.innerHTML).to.equal('racecar');

              clock.tick(100);

              DOMBars.VM.exec(function () {
                expect(fixture.innerHTML).to.equal('');
                return done();
              });
            });

            it('should update conditional block helpers', function (done) {
              var template = DOMBars.compile(
                '{{#if test}}true{{else}}false{{/if}}'
              )({ test: true });

              fixture.appendChild(template);
              expect(fixture.innerHTML).to.equal('true');

              clock.tick(100);

              DOMBars.VM.exec(function () {
                expect(fixture.innerHTML).to.equal('false');
                return done();
              });
            });

            it(
              'should call unsubscriptions when code is no longer reachable',
              function (done) {
                var spy = sinon.spy();

                DOMBars.registerHelper('helper', function () {
                  DOMBars.VM.unsubscribe(spy);

                  return 'helper';
                });

                var template = DOMBars.compile(
                  '{{#test}}{{helper}}{{/test}}'
                )({ test: true });

                fixture.appendChild(template);
                expect(fixture.innerHTML).to.equal('helper');

                clock.tick(100);

                DOMBars.VM.exec(function () {
                  expect(spy).to.have.been.calledOnce;
                  expect(fixture.innerHTML).to.equal('');
                  return done();
                });
              }
            );
          });
        });
      });
    });
  });

  describe('Events', function () {
    it('should trigger an event when an element is created', function () {
      DOMBars.once('createElement', function (el) {
        expect(el.tagName).to.equal('SPAN');
      });

      DOMBars.compile('<span></span>')();
    });

    it('should trigger an event when a comment node is created', function () {
      DOMBars.once('createComment', function (comment) {
        expect(comment.textContent).to.equal(' Test ');
      });

      DOMBars.compile('<!-- Test -->')();
    });

    it('should trigger an event when an attribute is set', function () {
      DOMBars.once('setAttribute', function (el, name, value) {
        expect(el.tagName).to.equal('P');
        expect(name).to.equal('this');
        expect(value).to.equal('that');
      });

      DOMBars.compile('<p this="that"></p>')();
    });

    it('should trigger an event when an attribute is removed', function (done) {
      DOMBars.subscribe = function (obj, name, fn) {
        obj[name] = !obj[name];
        setTimeout(fn, 100);
      };

      DOMBars.once('removeAttribute', function (el, name) {
        expect(el.tagName).to.equal('DIV');
        expect(name).to.equal('test');
        return done();
      });

      DOMBars.compile('<div test="{{{test}}}"></div>')({
        test: true
      });

      clock.tick(100);
    });

    it('should trigger an event any time a child is appended', function () {
      DOMBars.once('appendChild', function (parent, child) {
        expect(parent.tagName).to.equal('DIV');
        expect(child.textContent).to.equal('appended');
      });

      DOMBars.compile('<div>appended</div>')();
    });

    it('should trigger an event with every text expression', function () {
      DOMBars.once('textify', function (text) {
        expect(text.textContent).to.equal('test content');
      });

      DOMBars.compile('{{test}}')({ test: 'test content' });
    });

    it('should trigger an event with every dom expression', function () {
      DOMBars.once('domify', function (dom) {
        expect(dom.innerHTML).to.equal('<p>testing</p>');
      });

      DOMBars.compile('{{{test}}}')({ test: '<div><p>testing</p></div>' });
    });
  });
});
