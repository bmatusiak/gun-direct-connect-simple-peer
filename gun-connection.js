

var GUN = require('gun');
var SEA = require('gun/sea');


module.exports = function() {


    const server = require('http').createServer().listen(8765);

    return GUN({ web: server, peers: ["https://peersocial.io/gun", "https://onlykey.herokuapp.com/gun", "https://gun-manhattan.herokuapp.com/gun"] });

};

module.exports.GUN = GUN;
module.exports.SEA = SEA;