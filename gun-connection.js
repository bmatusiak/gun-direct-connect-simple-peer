

var GUN = require('gun');
var SEA = require('gun/sea');


module.exports = function(use_webserver) {


    var server = false;//require('http').createServer().listen(8765);
    if(use_webserver)
        server = require('http').createServer().listen(8765, function(){
            console.log("webserver listening")
        });
        
    var  peers = ["https://peersocial.io/gun", "https://onlykey.herokuapp.com/gun", "https://gun-manhattan.herokuapp.com/gun"];
    
    if(!use_webserver)
        peers.push("http://localhost:8765/gun" )
    
    return GUN({ web: server, peers: peers });

};

module.exports.GUN = GUN;
module.exports.SEA = SEA;