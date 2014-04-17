
var extend = require('extend');
var Google = require('google');
var Bing = require('bing');
var leaderUtils = require('leader-utils');
var objCase = leaderUtils.objcase;
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
        debug('bing scrape failed - scraping google');
        google.query(query, function (err, nextPage, results) {
          var success = handleResult(err, companyQuery, results, person, context);
          // we make sure there is an error before retrying in case no results were found.
          // don't want to use up quota.
          if (!success && err) {
            debug('google scrape failed %s, - bing api', err.message);
            // fall back on api for bing.
            bing.queryApi(query, function (err, nextPage, results) {
              var success = handleResult(err, companyQuery, results, person, context);
              if (!success) {
                debug('bing api failed %s, - falling back to google api', err);
                // last but not least - fallback on google api.
                google.queryApi(query, function(err, nextPage, results) {
                  if (err) return next(err); 
                  handleResult(err, companyQuery, results, person, context);
                  next();
                });
              } else {
                // success for bing api.
                next(err);
              }
            });
          } else {
            // success for google
            next(err);
          }
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
    var okUrl = result.href.indexOf('linkedin.com') !== -1;
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
    return leaderUtils.accurateTitle(title, query);
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
  var company = leaderUtils.getCompanyName(person);
  var domain = leaderUtils.getInterestingDomain(person);
  var companyDomain = leaderUtils.getCompanyDomain(person);
  return companyDomain || domain || company;
}


function getCompanyLinkedUrl(person, context) {
  return objCase(person, 'company.linkedin.url');
}