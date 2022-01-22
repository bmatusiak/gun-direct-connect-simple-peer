

var hash = "igSBrdYKihT4nD5ggix/U4Snrpk+N2TKjDT05xCZXK8=234567891234567"
  +(new Date().getTime());
  
  
require("./index.js")(false,hash);

setTimeout(function(){
  require("./index.js")(true,hash);
},1000)