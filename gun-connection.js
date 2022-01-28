

var GUN = require('gun');
var SEA = require('gun/sea');
var nts = require('gun/nts');


module.exports = function(use_webserver) {
    
    use_webserver = false;

    var server = false;//require('http').createServer().listen(8765);
    if(use_webserver)
        server = require('http').createServer().listen(8765, function(){
            console.log("webserver listening")
        });
        
    var  peers = ["https://www.peersocial.io/gun" , "https://onlykey.herokuapp.com/gun", "https://gun-manhattan.herokuapp.com/gun"];
    
    
    // if(!use_webserver)
    //     peers.push("http://localhost:8765/gun" )
    var $g = GUN({ web: server, peers: peers });
    
    var mesh = $g.back('opt.mesh'); // DAM;
    mesh.say({ dam: 'opt', opt: { peers: peers } });
    
    return $g

};

module.exports.GUN = GUN;
module.exports.SEA = SEA;
