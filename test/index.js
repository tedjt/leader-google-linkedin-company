
var assert = require('assert');
var Plugin = require('..');

describe('leader-google-linkedin-company', function () {
  this.timeout(30000);

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
    var person = { domain: { name: 'segment.io', disposable: false, personal: false }, linkedin: {url: 'http:.../'} };
    var context = {};
    assert(!plugin.wait(person, context));
  });

  it('should google for an linkedin domain', function (done) {
    var person = { domain: { name: 'segment.io', disposable: false, personal: false }};
    var context = {};
    plugin.fn(person, context, function (err) {
      if (err) return done(err);
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
