# DOMBars

DOMBars is an extension of [Handlebars.js](https://github.com/wycats/handlebars.js). It keeps almost all the same semantics of Handlebars, but instead generates DOM objects instead of string-based templates. This is an extremely powerful concept when you consider data binding and reactive programming. By creating DOM representations of a template, we can easily keep track of all the generated template and update only the specific node when any data changes. All this without any random attributes having to be added to the HTML markup.

## API

The API is 100% compatible with Handlebars, but it adds some extended functionality. Semantically, there is zero change. However, some things to note is that helper functions will generate DOM objects (instead of strings) so you can't just concatinate strings and hope for the best. The approach here would be to append each function output to a document fragment.

### Getters

To provide a custom getter function, just set it under `DOMBars.get`. The function accepts two arguments (`object` and `name`).

### Subscribers

Subscriptions are used for doing data binding. By default, the subscription is a no-op. To set a custom subscription function, just alias it under `DOMBars.subscribe`. The function itself accepts three arguments (`object`, `name` and `callback`). For example, to do data binding in Backbone.js:

```js
DOMBars.subscribe = function (object, name, callback) {
  object.on('change:' + name, callback);
};
```

## Example

```js
// Set a custom subscription function just for the test.
DOMBars.subscribe = function (obj, name, fn) {
  // Every 2 seconds we will be turning the checkbox on and off again.
  setInterval(function () {
    obj[name] = !obj[name];
    fn();
  }, 2000);
};

// Generate a template.
var template = DOMBars.compile(
  '<input type="checkbox" checked="{{{test}}}">'
)({
  test: false
});

// Append the template directly to the body element.
document.body.appendChild(template);
```

## License

MIT
