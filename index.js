module.exports = function(initiator, hash) {
    var SIDE_1 = initiator ? "peer1" : "peer2";
    var SIDE_2 = initiator ? "peer2" : "peer1";

    var GUN = require("./gun-connection.js")
    var SEA = GUN.SEA;

    var $crypto = require('crypto');

    var Peer = require('simple-peer');
    var wrtc = require('wrtc');

    var gun = GUN(!initiator);


    var hash_alias = $crypto.createHash('sha256').update(hash).digest().toString("hex");


    var Peer = require('simple-peer')

    var peer = new Peer({ initiator: initiator, wrtc: wrtc })
    
    var connected = false;
    
    gun.get("simple-peer").get(hash_alias).get(SIDE_2).get("signal").map().on(function(data, id) {
        console.log(id, "Data from "+SIDE_2, data)
        if(!connected)
            peer.signal(data_parse(data))
    })
    
    var signalList = [];
    
    function putSignal(data) {
        signalList.push(async function(done){
            
            ++signal_id;
            console.log(signal_id,SIDE_1, "put signal")
            gun.get("simple-peer").get(hash_alias).get(SIDE_1).get("signal").get(signal_id).put(data_stringify(data),done)
        })
    }
    
    var signal_id = 0;
    peer.on('signal', data => {
        // console.log(SIDE_1, data)
        // when peer1 has signaling data, give it to peer2 somehow
        putSignal(data)
        
        // gun.get("simple-peer").get(hash_alias).get(SIDE_1).get("signal").get(signal_id).put(data_stringify(data))
    })

    peer.on('connect', () => {
        connected = true;
        // wait for 'connect' event before using the data channel
        console.log("connected to", SIDE_2)
        
        setInterval(function(){
            peer.send('hello ' + SIDE_2 + ', how is it going?')    
        },1000)
        
    })

    peer.on('data', data => {
        // got a data channel message
        console.log('got a message from ' + SIDE_2 + ': ' + data)
    })
    
    // peer.on("error", console.log)


    function data_stringify(data) {
        return "JSON" + JSON.stringify(data);
    }

    function data_parse(data) {
        if (data)
            if (data.slice(0, 4) == "JSON") {
                return JSON.parse(data.slice(4));
            }
        else {
            return JSON.parse(data);
        }
    }
    var waiting_for_ack = false;
    setInterval(async function() {
        if(waiting_for_ack) return;
        var exe = signalList.shift()
        if(exe){
            waiting_for_ack = true;
            exe(async function(ack){
                // setTimeout(async function(){
                    
                    waiting_for_ack = false;
                 
                // },100)
            });
        }
    }, 1)


    // console.log(gun);
}