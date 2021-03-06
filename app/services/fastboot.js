/* global FastBoot */
import Ember from "ember";

const { deprecate, computed, get, assert } = Ember;
const { deprecatingAlias, readOnly } = computed;

const RequestObject = Ember.Object.extend({
  init() {
    this._super(...arguments);

    let request = this.request;
    delete this.request;

    let protocol = request.protocol.replace(':', '');
    let forwardedProto = request.headers['headers']['x-forwarded-proto'];
    if (forwardedProto) {
      protocol = forwardedProto[0];
    }

    this.cookies = request.cookies;
    this.headers = request.headers;
    this.queryParams = request.queryParams;
    this.path = request.path;
    this.protocol = protocol;
    this._host = function() {
      return request.host();
    };
  },

  host: computed(function() {
    return this._host();
  })
});

const Shoebox = Ember.Object.extend({
  put(key, value) {
    assert('shoebox.put is only invoked from the FastBoot rendered application', this.get('fastboot.isFastBoot'));
    assert('the provided key is a string', typeof key === 'string');

    let fastbootInfo = this.get('fastboot._fastbootInfo');
    if (!fastbootInfo.shoebox) { fastbootInfo.shoebox = {}; }

    fastbootInfo.shoebox[key] = value;
  },

  retrieve(key) {
    if (this.get('fastboot.isFastBoot')) {
      let shoebox = this.get('fastboot._fastbootInfo.shoebox');
      if (!shoebox) { return; }

      return shoebox[key];
    }

    let shoeboxItem = this.get(key);
    if (shoeboxItem) { return shoeboxItem; }

    let el = document.querySelector(`#shoebox-${key}`);
    if (!el) { return; }
    let valueString = el.textContent;
    if (!valueString) { return; }

    shoeboxItem = JSON.parse(valueString);
    this.set(key, shoeboxItem);

    return shoeboxItem;
  }
});

const FastBootService = Ember.Service.extend({
  cookies: deprecatingAlias('request.cookies', { id: 'fastboot.cookies-to-request', until: '0.9.9' }),
  headers: deprecatingAlias('request.headers', { id: 'fastboot.headers-to-request', until: '0.9.9' }),
  isFastBoot: typeof FastBoot !== 'undefined',

  init() {
    this._super(...arguments);

    let shoebox = Shoebox.create({ fastboot: this });
    this.set('shoebox', shoebox);
  },

  host: computed(function() {
    deprecate(
      'Usage of fastboot service\'s `host` property is deprecated.  Please use `request.host` instead.',
      false,
      { id: 'fastboot.host-to-request', until: '0.9.9' }
    );

    return this._fastbootInfo.request.host();
  }),

  response: readOnly('_fastbootInfo.response'),
  metadata: readOnly('_fastbootInfo.metadata'),

  request: computed(function() {
    if (!this.isFastBoot) return null;
    return RequestObject.create({ request: get(this, '_fastbootInfo.request') });
  }),

  deferRendering(promise) {
    assert('deferRendering requires a promise or thennable object', typeof promise.then === 'function');
    this._fastbootInfo.deferRendering(promise);
  }
});

export default FastBootService;
