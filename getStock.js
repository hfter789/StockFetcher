var fs = require("fs");
var request = require('request');
var _ = require('lodash');
var async = require('async');
var config = require('./configs/config.json');
var api = 'https://query.yahooapis.com/v1/public/yql?q=';
var queryPre = 'select symbol, MarketCapitalization from yahoo.finance.quote where symbol in ("';
var querySuf = '")&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=';

function expandInt(marketCapString) {
  if (marketCapString && typeof marketCapString === 'string') {
    var marketCapVal;
    var regex = /\d+.?\d*[M,B]?/;
    if (regex.test(marketCapString)) {
      var marketCapUnit = marketCapString[marketCapString.length - 1];
      marketCapVal = parseFloat(marketCapString.substring(0, marketCapString.length - 2));
      if (marketCapUnit === 'M') {
        marketCapVal *= 1000000;
      } else {
        marketCapVal *= 1000000000;
      }
    } else {
      marketCapVal = parseFloat(marketCapString.substring(0, marketCapString.length - 1));;
    }
    return marketCapVal;
  }
  return -1;
}

function processResult(caps) {
  var targetIndex = Math.round(caps.length / 4);
  var target = _.sortBy(caps, 'marketCap').slice(0, targetIndex);
  console.log(target);
  fs.writeFile('data/marketCapResult.json', JSON.stringify(target, null, 2), function (err) {
    if (err) throw err;
    console.log('It\'s saved!');
  });
}

function processSymbol(symbols) {
  var caps = [];
  var counter = 0;
  var paths = [];
  while (counter < symbols.length) {
    counter += 1000;
    var path = [api, queryPre, symbols.slice(counter-1000,counter).join('","'), querySuf].join('');
    paths.push(path);
  }
  async.each(paths, function(path, callback) {
    request(path, function(error, response, body) {
      var jsonBody = JSON.parse(body);
      jsonBody.query.results.quote.forEach(function (pair) {
        var marketCap = expandInt(pair.MarketCapitalization);
        if (marketCap > 0) {
          caps.push({
            marketCap: marketCap,
            symbol: pair.symbol
          });
        }
      });
      callback();
    })
  },
  function(err) {
    processResult(caps);
  });
}


fs.readFile(config.dataPath, "utf8", function(error, data) {
  var symbols = [];
  if (error) {
    console.log('ERROR!');
  } else {
    //do stuff with data
    var lines = data.split('\n');
    async.each(lines, function(line, callback) {
      var stockSymbol = line.split('|')[0];
      if(stockSymbol) {
        symbols.push(stockSymbol);
      }
      callback();
    },
    function(err) {
      processSymbol(symbols);
    });
  }
});