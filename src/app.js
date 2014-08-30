/**
 * Pebble app for showing the closest five transit stops, and the next departures at those.
 */

var UI = require('ui');
var ajax = require('ajax');
var init = true;

var penguin = new UI.Card({ banner: 'images/frozen.png' });
penguin.show();

var utf8_encode = function(argString) {
  //  discuss at: http://phpjs.org/functions/utf8_encode/
  // original by: Webtoolkit.info (http://www.webtoolkit.info/)
  // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: sowberry
  // improved by: Jack
  // improved by: Yves Sucaet
  // improved by: kirilloid
  // bugfixed by: Onno Marsman
  // bugfixed by: Onno Marsman
  // bugfixed by: Ulrich
  // bugfixed by: Rafal Kukawski
  // bugfixed by: kirilloid
  //   example 1: utf8_encode('Kevin van Zonneveld');
  //   returns 1: 'Kevin van Zonneveld'

  if (argString === null || typeof argString === 'undefined') {
    return '';
  }

  var string = (argString + ''); // .replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  var utftext = '',
    start, end, stringl = 0;

  start = end = 0;
  stringl = string.length;
  for (var n = 0; n < stringl; n++) {
    var c1 = string.charCodeAt(n);
    var enc = null;

    if (c1 < 128) {
      end++;
    } else if (c1 > 127 && c1 < 2048) {
      enc = String.fromCharCode(
        (c1 >> 6) | 192, (c1 & 63) | 128
      );
    } else if ((c1 & 0xF800) != 0xD800) {
      enc = String.fromCharCode(
        (c1 >> 12) | 224, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128
      );
    } else { // surrogate pairs
      if ((c1 & 0xFC00) != 0xD800) {
        throw new RangeError('Unmatched trail surrogate at ' + n);
      }
      var c2 = string.charCodeAt(++n);
      if ((c2 & 0xFC00) != 0xDC00) {
        throw new RangeError('Unmatched lead surrogate at ' + (n - 1));
      }
      c1 = ((c1 & 0x3FF) << 10) + (c2 & 0x3FF) + 0x10000;
      enc = String.fromCharCode(
        (c1 >> 18) | 240, ((c1 >> 12) & 63) | 128, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128
      );
    }
    if (enc !== null) {
      if (end > start) {
        utftext += string.slice(start, end);
      }
      utftext += enc;
      start = end = n + 1;
    }
  }

  if (end > start) {
    utftext += string.slice(start, stringl);
  }

  return utftext;
};

var launchMenu = function(data, callback, params) {
  var menu = new UI.Menu({
    sections: [{
      items: data
    }]
  });
  menu.show();
  if (!params) {
    menu.on('select', function(e) {
      if (callback) callback(e.item);
    });
  }
  else {
    callback(menu, params);
  }
  if (init) penguin.hide(); init = false;  
};

var updateBusses = function(menu, params) {
  console.log(menu.toString());
};

var fetchBusses = function(item) {
  ajax(
    {
      url: 'http://rejseplan.jit.su/departureBoard?id=' + item.id,
      type: 'json'
    },
    function(data) {
      var date = new Date();
      var busses = [];
      var i = 0;
      for (i = 0; i<data.DepartureBoard.Departure.length; i++) {
        var bus = data.DepartureBoard.Departure[i];
        var tempBus = {};
        var tempDate = new Date();
        var oneMinute = 1000*60;
        tempDate.setHours(parseInt(bus.$.time.split(':')[0]));
        tempDate.setMinutes(parseInt(bus.$.time.split(':')[1]));        
        tempDate.setDate(parseInt(bus.$.date.split('.')[0]));
        tempDate.setMonth(parseInt(bus.$.date.split('.')[1])-1);
        tempDate.setYear(2000 + parseInt(bus.$.date.split('.')[2]));
        var timeDiff = Math.round((tempDate.getTime() - date.getTime()) / oneMinute);
        var busType = utf8_encode(bus.$.name.replace('Bus ','').replace('Natbus ',''));
        tempBus.title = busType + ' ' + utf8_encode(bus.$.direction);
        tempBus.subtitle = timeDiff + ' minutter';
        tempBus.id = bus.$.id;
        tempBus.time = bus.$.time;
        tempBus.date = bus.$.date;
        busses.push(tempBus);

        if (i+1 == data.DepartureBoard.Departure.length) launchMenu(busses, updateBusses, item.id);
      }
    },
    function(error) {
      console.log('The ajax request failed: ' + error);
    }
  );
};

var fetchStops = function(coordX, coordY) {
  ajax(
    {
      url: 'http://rejseplan.jit.su/stopsNearby?coordX=' + coordX + '&coordY=' + coordY + '&maxRadius=1000&maxNumber=15',
      type: 'json'
    },
    function(data) {
      var locations = [];
      var i = 0;
      for (i = 0; i<data.LocationList.StopLocation.length; i++) {
        var stop = data.LocationList.StopLocation[i];
        var tempStop = {};
        tempStop.title = stop.$.name.replace(/\ø/g, 'oe').replace(/\æ/g, 'ae').replace(/\å/g, 'aa').replace(/\Æ/g).replace('Ae').replace(/\Ø/g).replace('Oe').replace(/\Å/g, 'Aa').replace(/\,null/g,'');
        tempStop.id = stop.$.id;
        locations.push(tempStop);

        if (i+1 == data.LocationList.StopLocation.length) launchMenu(locations, fetchBusses);
      }
    },
    function(error) {
      console.log('The ajax request failed: ' + error);
    }
  );
};

var getCoordinates = function(position) {
  var coordinates = position.coords;
  fetchStops(Math.floor(coordinates.longitude * 1000000), Math.floor(coordinates.latitude * 1000000));
};

navigator.geolocation.getCurrentPosition(getCoordinates);
