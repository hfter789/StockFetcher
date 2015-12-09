var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
var _ = require('lodash');
var fs = require('fs');
var stocks = require('./data/marketCapResult1.json');
var api = 'http://www.nasdaq.com/symbol/'
var route = '/insider-trades';

var result = [];
async.each(stocks, function(pair, callback) {
  var symbol = pair.symbol;
  var path = [api, symbol, route].join('');
  request(path, function(error, response, body) {
    if (error) {
      console.log('ERROR:', error);
    }
    console.log(response);
    var $ = cheerio.load(body, {xmlMode: true});
    //[3 month count, 12 month count, 3 month shares, 12 month shares]
    var buy = $('.infoTable .color-green td');
    var sell = $('.infoTable .color-red td');
    // add 1 on each to prevent divide by 0 issue
    if(buy[3]) {
      var shareRatio = (buy[3].children[0].data.replace(',','') + 1) /
       (sell[3].children[0].data.replace(',','') + 1);
      // console.log(countRatio);
      if(!isNaN(shareRatio)){
        result.push({
          symbol: symbol,
          ratio: shareRatio
        });
      }
    }
    callback();
  });
},
function(err) {
  if (err) {
    console.log('ERROR:', err);
  }
  selectStockByRatio(result);
});

function selectStockByRatio (result) {
  var targetIndex = Math.round(result.length / 10);
  var target = _.sortBy(result, 'ratio').slice(result.length - targetIndex, result.length);
  console.log(result);
  console.log(target);
  fs.writeFile('data/RatioResult.json', JSON.stringify(target, null, 2), function (err) {
    if (err) throw err;
    console.log('It\'s saved!');
  });
}
