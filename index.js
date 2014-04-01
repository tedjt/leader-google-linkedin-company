
var extend = require('extend');
var Google = require('google');
var Bing = require('bing');
var objCase = require('obj-case');
var url = require('url');
var debug = require('debug')('leader:google-linkedin-company');

/**
 * Create a new leader plugin.
 *
 * @returns {Object}
 */

module.exports = function (proxyManager) {
  return { fn: plugin(proxyManager), wait: wait };
};

/**
 * Create a domain googling leader plugin.
 *
 * @return {Function}
 */

function plugin (proxyManager) {
  var google = proxyManager ? Google({proxyManager: proxyManager}) : Google();
  var bing = proxyManager ? Bing({proxyManager: proxyManager}) : Bing();
  return function googleLinkedinCompany (person, context, next) {
    var domain = getDomain(person, context);
    if (!domain) return next();
    var query = 'site:linkedin.com company ' + domain;
    // prefer bing
    bing.query(query, function (err, nextPage, results) {
      var result = handleResult(err, results, person, context);
      if (!result) {
        google.query(query, function (err, nextPage, results) {
          if (err) return next(err);
          handleResult(err, results, person, context);
          return next();
        });
      } else {
        // success for bing..
        return next(err);
      }
    });
  };
}

function handleResult(err, results, person, context) {
  if (err) return false;
  if (results && results.links && results.links.length > 0) {
    results = results.links.filter(function(l) {
      return l.link.indexOf('/company/') !== -1 && l.link.indexOf('linkedin.com/redir/redirect') === -1;
    });
    var result = results[0];
    if (!result) {
      return false;
    }
    debug('found result link: %s', result.link);
    var parsed = url.parse(result.link);
    if (parsed.host && parsed.host.indexOf('linkedin.com') !== -1) {
      extend(true, person, {
        company: { linkedin: { url: result.link }}
      });
      extend(true, context, {
        company: { google: {linkedin: { url: result.link }}}
      });
      return result;
    }
  }
  return false;
}

/**
 * Wait until we have an interesting domain.
 *
 * @param {Object} context
 * @param {Object} person
 * @return {Boolean}
 */

function wait (person, context) {
  return getDomain(person, context) && !getLinkedUrl(person, context);
}

/**
 * Get an interesting domain.
 *
 * @param {Object} context
 * @param {Object} person
 * @return {String}
 */

function getDomain (person, context) {
  if (person.domain && !person.domain.disposable && !person.domain.personal)
    return person.domain.name;
  else
    return null;
}

function getLinkedUrl(person, context) {
  if (person.linkedin && person.linkedin.url) {
    return person.linkedin.url;
  } else {
    return null;
  }
}

