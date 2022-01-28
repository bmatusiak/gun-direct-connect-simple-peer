module.exports = function(initiator, pair_me, pair_them) {
    var SIDE_1 = initiator ? "peer1" : "peer2";
    var SIDE_2 = initiator ? "peer2" : "peer1";

    var hotp = require('hotp')
    var GUN = require("./gun-connection.js")
    var SEA = GUN.SEA;

    var $crypto = require('crypto');

    var Peer = require('simple-peer');
    var wrtc = require('wrtc');

    var gun = GUN(!initiator);

    var topt_options = {
        timeStep: 5,
        algorithm: "sha256",
        digits: 8,
        get time() {
            return new Date(GUN.GUN.state()).getTime() / 1000;
        }
    };
    var hotp_options = { algorithm: topt_options.algorithm, digits: topt_options.digits };
    var interval = 1000;


    var run_tx = false;
    var run_rx = false;

    var signalData = [];
    var signalData_NOUNCE = 0;
    var peer = peer_factory(function($signalData) {
        if ($signalData.length)
            signalData = $signalData;
        ++signalData_NOUNCE;
    });
    
    
    var PUB = initiator ? pair_me.pub+pair_them.pub : pair_them.pub+pair_me.pub;
                
    var last_tx, last_rx, lt_tx, lt_rx;
    setInterval(async function() {


        // if (run_rx) return;

        if (!run_tx) {
            (async function() {
                var hash_alias = $crypto.createHash('sha256').update(PUB).digest().toString("hex");

                var newToken = false;
                var token = parseInt(hotp.totp(hash_alias, topt_options))

                if (token != lt_rx) {
                    // console.log("new token", typeof token, token);
                    newToken = true;
                    lt_rx = token;
                }
                if (newToken && signalData.length) {
                    run_tx = true;

                    var $t = JSON.stringify({ nounce: signalData_NOUNCE, signals: signalData });
                    // console.log($t)
                    var t = await SEA.encrypt($t, await SEA.secret(pair_them.epub, pair_me));

                    var $token = hotp(hash_alias, token, hotp_options);
                    gun.get($token).get(hash_alias).get("tx").get(SIDE_1).put(t, function() {
                        run_tx = false;
                        console.log(SIDE_1, "put tx", signalData_NOUNCE, signalData.length);
                        // ++signalData_NOUNCE;
                    });
                }
            })();
        }
        if (!run_rx) {
            (async function() {
                var hash_alias = $crypto.createHash('sha256').update(PUB).digest().toString("hex");

                // var newToken = false;
                var token = parseInt(hotp.totp(hash_alias, topt_options));

                // if (token != lt_tx) {
                //     // console.log("new token", typeof token, token);
                //     newToken = true;
                //     lt_tx = token;
                // }
                // if (newToken) {
                    run_rx = true;
                    
                    var $token = hotp(hash_alias, token, hotp_options);
                    gun.get($token).get(hash_alias).get("tx").get(SIDE_2).once(async function(data, index) {
                        run_rx = false;
                        if (!data || last_tx == data) return;
                        last_tx = data;

                        var d = data;
                        if (data.indexOf("SEA") >= 0)
                            d = await SEA.decrypt(d, await SEA.secret(pair_them.epub, pair_me));
                        
                        if(SIDE_1 == "peer1")
                            console.log(SIDE_1, "get", d, index);
                        
                        if(!d.ack && d.nounce){
                            var $t = JSON.stringify({ ack: d.nounce });
                            // console.log($t)
                            var t = await SEA.encrypt($t, await SEA.secret(pair_them.epub, pair_me));
    
                            gun.get($token).get(hash_alias).get("tx").get(SIDE_1).put(t, function() {
                                // run_tx = false;
                                console.log(SIDE_1, "put tx-ack", signalData_NOUNCE, signalData.length);
                                
                                if(d.signals){
                                    for(var i in d.signals){
                                        peer.signal(d.signals[i]);
                                    }
                                }
                                // ++signalData_NOUNCE;
                            })
                        }else{
                            if(d.ack == signalData_NOUNCE){
                                console.log("ACK", SIDE_1)
                                signalData = [];
                                // ++signalData_NOUNCE;
                            }
                        }
                        
                    });
                // }
            })();
        }
    }, interval);


    function peer_factory(signaler) {
        var connected = false;
        var peer = new Peer({ initiator: initiator, wrtc: wrtc });

        var signals = [];
        
        peer.on("error", function(e) {
            console.log(SIDE_1, "error", e );
        });
        
        
        peer.on("close", function() {
            console.log(SIDE_1, "closed");
            connected = false;
        });
        
        peer.on('signal', data => {
            // console.log(SIDE_1, data)
            // when peer1 has signaling data, give it to peer2 somehow
            // putSignal(data)
            signals.push(data);
            // gun.get("simple-peer").get(hash_alias).get(SIDE_1).get("signal").get(signal_id).put(data_stringify(data))
        })

        peer.once("_iceComplete", function() {
            console.log("_iceComplete")
            if (signals.length) {
                signaler(signals);
                signals = [];
            }
        })

        peer.on('connect', () => {
            // wait for 'connect' event before using the data channel
            console.log("connected to", SIDE_2)
            connected = true;
            
            setInterval(function() {
                if(connected)
                    peer.send('hello ' + SIDE_2 + ', how is it going? ' + (new Date().getTime()))
            }, 1000)

        })

        peer.on('data', data => {
            // got a data channel message
            console.log('got a message from ' + SIDE_2 + ': ' + data)
        })
        
        return peer;
    }
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

    // console.log(gun);
}