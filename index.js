
var extend = require('extend');
var Google = require('google');
var Bing = require('bing');
var objCase = require('obj-case');
var Levenshtein = require('levenshtein');
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

module.exports.test = {accurateTitle: accurateTitle};

/**
 * Create a domain googling leader plugin.
 *
 * @return {Function}
 */

function plugin (proxyManager) {
  var google = proxyManager ? Google({proxyManager: proxyManager}) : Google();
  var bing = proxyManager ? Bing({proxyManager: proxyManager}) : Bing();
  return function googleLinkedinCompany (person, context, next) {
    var companyQuery = getQueryTerm(person, context);
    if (!companyQuery) return next();
    var query = 'site:linkedin.com company ' + companyQuery;
    // prefer bing
    bing.query(query, function (err, nextPage, results) {
      var result = handleResult(err, companyQuery, results, person, context);
      if (!result) {
        google.query(query, function (err, nextPage, results) {
          if (err) return next(err);
          handleResult(err, companyQuery, results, person, context);
          return next();
        });
      } else {
        // success for bing..
        return next(err);
      }
    });
  };
}

function handleResult(err, companyQuery, results, person, context) {
  if (err) return false;
  if (results && results.links && results.links.length > 0) {
    results = results.links.filter(function(l) {
      return l.link.indexOf('/company/') !== -1 && l.link.indexOf('linkedin.com/redir/redirect') === -1;
    });
    var result = results[0];
    if (!result) {
      // we searched but didn't find anything. for now
      // just return - don't want to search google
      return true;
    }
    debug('found result link: %s', result.link);
    var parsed = url.parse(result.link);
    var okUrl = parsed.host && parsed.host.indexOf('linkedin.com') !== -1;
    if (okUrl && accurateTitle(result, companyQuery)) {
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

var MAX_DIST = 7;
function accurateTitle (result, query) {
  var title = (result.title || '').split('|')[0].trim().toLowerCase();
  query = query.toLowerCase();
  if (query) {
    var lev = new Levenshtein(title, query);
    if (lev.distance < MAX_DIST) {
      return true;
    }
    // attempt to scan full company name by token for our query term
    var splitTitle = title.split(/\s+/);
    var splitQuery = query.split(/\s+/);
    if (splitTitle.length > 1 && splitTitle.length > splitQuery.length) {
      for (var i=0; i < splitTitle.length; i++) {
        var substr = splitTitle.slice(i, i+splitQuery.length).join(' ');
        lev = new Levenshtein(query, substr);
        if (lev.distance < MAX_DIST) {
          return true;
        }
      }
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
  return getQueryTerm(person, context) && !getCompanyLinkedUrl(person, context);
}

function getQueryTerm(person, context) {
  // actually prefer domain as that will be crawled on company page.
  // while many personal pages will reference the company name.
  return getDomain(person, context) || getCompanyName(person, context);
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

function getCompanyName (person, context) {
  return objCase(person, 'company.name');
}

function getCompanyLinkedUrl(person, context) {
  return objCase(person, 'company.linkedin.url');
}

