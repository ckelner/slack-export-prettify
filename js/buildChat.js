// def not super proud of this - no framework or backend, so some big hacks
self.addEventListener('message', function(e) {
  var channel = e.data.channel;
  var channelData = e.data.channelData;
  var userData = e.data.userData;
  var channelChat = "<div class='col-lg-10 col-md-10 col-sm-9 col-xs-6'>" +
  // channel header
    "<div class='table-responsive'>" +
    "<table class='table'><tr><td class='channelheadertd'>" +
    "<h2 class='channelheader'>" +
      channel.name +
    "</h2></td>" +
    "<td class='channelheadertd'><h4 class='channelpurpose'>" +
      channelData["purpose"] +
    "</h4></td><td class='channelheadertd'><b class='channelarchived'>" +
      "[Archived: " + channelData["is_archived"] +
    "]</b></td></tr></table></div><div class='table-responsive'>" +
    "<table class='table table-striped'>";
  for(var i=0, len=channelData["messages"].length;
    i<len; i++) {
    var msg = channelData["messages"][i];
    console.log("Debug: " + msg);
    // times 1000 to convert from epoch to UTC Seconds that JS Date understands
    var d = new Date(msg.ts.substr(0, msg.ts.indexOf('.'))* 1000);
    // might lose a few messages here; TODO: Fix
    if(userData[msg.user] != undefined) {
      channelChat += "<tr><td>" + "<img src='" + userData[msg.user].avatar +
        "'/></td>" + "<td><div><i>" + d.toUTCString() + "</i></div><div>" +
        msg.text + "</div></td></tr>";
    }
  }
  channelChat += "</table></div>";
  self.postMessage({"html": channelChat, "channelId": channel.id});
}, false);
