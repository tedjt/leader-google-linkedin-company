
var assert = require('assert');
var Plugin = require('..');

describe('leader-google-linkedin-company', function () {
  this.timeout(90000);

  var plugin = Plugin();

  it('should wait if theres no email', function () {
    var context = {}, person = {};
    assert(!plugin.wait(person, context));
  });

  it('should not wait if there is a company name', function () {
    var person = { domain: { name: 'segment.io', disposable: false, personal: false }};
    var context = {};
    assert(plugin.wait(person, context));
  });

  it('should wait if there is a company name and a linkedin url', function () {
    var person = { domain: { name: 'segment.io', disposable: false, personal: false }, company: {linkedin: {url: 'http:.../'} }};
    var context = {};
    assert(!plugin.wait(person, context));
  });

  it('should accurately choose comany based on title', function() {
    assert(!Plugin.test.accurateTitle({title: 'TheLEADSTACK | LinkedIn'}, 'stacklead.com'));
    assert(Plugin.test.accurateTitle({title: 'Haymarket Media Group | LinkedIn'}, 'haymarket.com'));
    // this doesn't work as expected :()
    assert(Plugin.test.accurateTitle({title: 'Zinc Digital Business Solutions Ltd | LinkedIn'}, 'zinc.io'));
    assert(!Plugin.test.accurateTitle({title: 'www.qatar-index.com | LinkedIn'}, 'index.com'));
    assert(Plugin.test.accurateTitle({title: 'Haymarket Media Group | LinkedIn'}, 'haymarket media'));
  });

  it('should google for an linkedin domain for stacklead.com', function (done) {
    var person = { domain: { name: 'stacklead.com', disposable: false, personal: false }};
    var context = {};
    plugin.fn(person, context, function (err) {
      if (err) return done(err);
      assert(!person.company);
      done();
    });
  });

  it.only('should google for an linkedin domain', function (done) {
    var person = { domain: { name: 'segment.io', disposable: false, personal: false }};
    var context = {};
    plugin.fn(person, context, function (err) {
      if (err) return done(err);
      console.log(person);
      assert(person.company.linkedin.url);
      done();
    });
  });

  it('should not google for an linkedin domain outlook.com', function (done) {
    var person = { domain: { name: 'outlook.com', disposable: false, personal: false }};
    var context = {};
    plugin.fn(person, context, function (err) {
      if (err) return done(err);
      console.log(person);
      assert(person.company.linkedin.url);
      done();
    });
  });
});
