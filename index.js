
var extend = require('extend');
var google = require('google')();
var objCase = require('obj-case');
var url = require('url');
var debug = require('debug')('leader:google-linkedin-company');

/**
 * Create a new leader plugin.
 *
 * @returns {Object}
 */

module.exports = function () {
  return { fn: plugin(), wait: wait };
};

/**
 * Create a domain googling leader plugin.
 *
 * @return {Function}
 */

function plugin () {
  return function googleLinkedinCompany (person, context, next) {
    var domain = getDomain(person, context);
    if (!domain) return next();
    var query = 'site:linkedin.com ' + domain;
    google.query(query, function (err, nextPage, results) {
      if (err) return next(err);
      if (results && results.links && results.links.length > 0) {
        var result = results.links[0];
        debug('found result link: %s', result.link);
        var parsed = url.parse(result.link);
        if (parse.host && parsed.host.indexOf('linkedin.com') !== -1 && 
          result.link.indexOf('linkedin.com/redir/redirect') === -1) {
          extend(true, person, {
            company: { linkedin: { url: result.link }}
          });
          extend(true, context, {
            company: { google: {linkedin: { url: result.link }}}
          });
        }
      }
      next();
    });
  };
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

