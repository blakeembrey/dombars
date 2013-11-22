# dombars

DOMBars is an extension of [Handlebars.js](https://github.com/wycats/handlebars.js). It keeps almost all the same semantics of Handlebars, but generates DOM objects instead of string-based templates. This is an extremely powerful concept when you consider data binding and reactive programming. By creating DOM representations of a template, we can easily keep track of all the generated nodes and update only the specific content when data changes. All of this is possible without any special markup being added to your HTML and Handlebars templates.

## Installation

Installing DOMBars is simple. Multiple builds are provided in the `dist` directory, just add the required script to you site. Alternatively DOMBars is available on [npm](https://npmjs.org/package/dombars).

## Usage

The API is backward-compatible with Handlebars, but extends it with all the DOM-based functionality. Semantically, there is zero change; however, one thing to keep in mind is that helper functions generate DOM objects (not strings), so you can't just concatenate together and hope for the best. To achieve a similar effect, create a document fragment and return it instead.

### Getters

To provide a custom getter function, just set `DOMBars.get` to your desired function. The function accepts two arguments, the `object` and `property`.

### Subscribers

Subscriptions are used to achieve data binding. By default, the subscription is a no-op. To set up your own custom subscription function, set `DOMBars.subscribe` to the disired subsciber. The function itself accepts three arguments - `object`, `property` and `callback`. For example, to do data binding with Backbone.js:

```js
DOMBars.subscribe = function (object, property, callback) {
  object.on('change:' + property, callback);
};
```

You also need to provide an unsubscribe function under `DOMBars.unsubscribe`. This function accepts the same three arguments - `object`, `property` and `callback`. The callback is the same function that was passed in with `DOMBars.subscribe`. For example, to unsubscribe a subscription in Backbone.js:

```js
DOMBars.unsubscribe = function (object, property, callback) {
  object.off('change:' + property, callback);
};
```

### Unsubscribing

DOMBars templates automatically unsubscribe listeners when a change happens. However, to unsubscribe the root DOM element you need to call the `unsubscribe` method on the returned DOM element. This is important since your listeners and helpers would otherwise not know to stop listening for changes, and would result in a fairly substantial memory leak over time.

## Examples

### Subscribers

```js
// Set a custom subscription function just for the test.
DOMBars.subscribe = function (obj, name, fn) {
  // Every 2 seconds we will be turning the checkbox on and off again.
  window.setInterval(function () {
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

// Append the template directly to the body element and watch the magic happen.
document.body.appendChild(template);
```

### Helpers

```js
DOMBars.registerHelper('currentTime', function () {
  var node = document.createTextNode(new Date().toLocaleTimeString());

  var interval = window.setInterval(function () {
    node.textContent = new Date().toLocaleTimeString();
  }, 1000);

  // Use the VM unsubscribe method to register a way to remove helper listeners.
  DOMBars.VM.unsubscribe(function () {
    window.clearInterval(interval);
  });

  return node;
});

var template = DOMBars.compile('{{currentTime}}')();

document.body.appendChild(template);
```

## License

MIT
