/*
Not super proud of this - no framework or backend, so some ugly hacks.
jQuery ($) is not available to web workers (nor is the dom) - so we resort to
"building" HTML as strings that get returned on the message object to the main
thread.
*/
/* Builds and returns an html string for all messages for a given channel */
onmessage = function(e) {
  // check what the worker should do, only two commands, process and stop/kill
  switch (e.data.cmd) {
    case 'process':
      /*
      - channel is the channel id and name object that we're concerned with
      - channelData has the messages array where each entry is a message for
        that specific channel
      - userData is info on all the users of the slack team
      */
      var channel = e.data.channel;
      var channelData = e.data.channelData;
      var userData = e.data.userData;
      // order all the messages by date - during concatenation, the for loop
      // grabs the files in from JSZip in a seemingly random order which ends
      // up with a jumbled chat log
      channelData["messages"] = orderMessagesByDate(channelData["messages"]);
      var channelChat = buildChannelHeader(channel.id, channel.name,
        channelData["purpose"], channelData["is_archived"]);
      // loop over all messages
      for(var i=0, len=channelData["messages"].length; i<len; i++) {
        var msg = channelData["messages"][i];
        if(msg.text != undefined) {
          // x1000 to convert from epoch to UTC Seconds that JS Date understands
          var d = new Date(msg.ts * 1000);
          var avatar = null;
          var name = null;
          if(userData[msg.user] != undefined) {
            avatar = userData[msg.user].avatar;
            name = userData[msg.user].name;
          }
          var massagedMsg = massageMsg(msg.text, userData);
          channelChat += buildChannelMsg(avatar, massagedMsg, name,
            d.toUTCString());
        }
      }
      channelChat += closeElement("table") + closeElement("div");
      self.postMessage({"html": channelChat, "channelId": channel.id});
    break;
    case 'stop':
      self.close();
    break;
  }
};

/* parses messages and replaces useless IDs with usernames */
function massageMsg(msg, userData) {
  // example "<@U03PUGYQ3|kelner>" or "<@U03UYCN69>"
  // This is a bit fraught with failure because users could have typed these
  // substrings into messages, but 1 in 1,000 msgs isn't so bad
  // TODO: come up with more foolproof method later
  var newMsg = "";
  var strStart = "<@";
  var strEnd = ">";
  var splitter = "|"
  var exists = msg.indexOf(strStart);
  if(exists != -1) {
    var msgArr = msg.split(strStart);
    for(var i=0, len=msgArr.length; i<len; i++) {
      var splitMsg = msgArr[i];
      if(splitMsg.indexOf(strEnd) != -1) {
        // sometimes these messages show up in channel joins, or image shares
        // which look like @<userid|name> other times it's an @<userid>: in a
        // chat, need a length to switch and tack on to account for both
        var endLen = 1;
        var substrToReplace = splitMsg.substring(0,
          splitMsg.indexOf(strEnd) + endLen);
        if(substrToReplace.indexOf(splitter) != -1) {
          strEnd = splitter;
        }
        var userId = substrToReplace.substring(0,
          substrToReplace.indexOf(strEnd));
        if(userData[userId] != undefined) {
          newMsg += splitMsg.replace(substrToReplace, "@" +
            userData[userId].name);
        } else {
          newMsg += splitMsg;
        }
      } else {
        newMsg += splitMsg;
      }
    }
  } else {
    newMsg = msg;
  }
  return newMsg;
}

/* Builds the channel header html */
function buildChannelHeader(id, name, purpose, archived) {
  // Indention in style of HTML for easier reading
  // 2 spaces of indention for each nested element
  return buildElement("div", "chat-" + id,
    "col-lg-10 col-md-10 col-sm-9 col-xs-6 hideme") +
    buildElement("div", null, "table-responsive") +
      buildElement("table", null, "table") +
        buildElement("tr", null, null) +
          buildElement("td", null, "channelheadertd") +
            buildElement("h2", null, "channelheader") +
              name +
            closeElement("h2") +
          closeElement("td") +
          buildElement("td", null, "channelheadertd") +
            buildElement("h4", null, "channelpurpose") +
              purpose +
            closeElement("h4") +
          closeElement("td") +
          buildElement("td", null, "channelheadertd") +
            buildElement("i", null, "channelarchived") +
              "[Archived: " + archived + "]" +
            closeElement("i") +
          closeElement("td") +
        closeElement("tr") +
      closeElement("table") +
    closeElement("div") +
    buildElement("div", null, "table-responsive") +
      buildElement("table", null, "table table-striped");
}

/* Builds the html for a single message entry */
function buildChannelMsg(avatar, msg, username, date) {
  if(avatar != null) {
    avatar = "<img src='" + avatar + "'/>";
  } else {
    avatar = "&nbsp;";
  }
  if(username != null) {
    username = "<b>" + username + "</b>&nbsp;&nbsp;&nbsp;";
  } else {
    username = "&nbsp;";
  }
  return buildElement("tr", null, null) +
    buildElement("td", null, "avatar") +
      avatar +
    closeElement("td") +
    buildElement("td", null, null) +
      buildElement("div", null, null) +
        username +
        "<i>" + date + "</i>" +
      closeElement("div") +
      buildElement("div", null, null) +
        msg +
      closeElement("div") +
    closeElement("td") +
  closeElement("tr");
}

// Utility functions
function buildElement(element, id, classes) {
  id = buildAttribute("id", id);
  classes = buildAttribute("class", classes);
  return "<" + element + id + classes + ">"
}
function buildAttribute(attr, value) {
  if(value != null && value != '') {
    return " " + attr + "='" + value + "'";
  } else {
    return "";
  }
}
function closeElement(element) {
  return "</" + element + ">"
}
function orderMessagesByDate(messages) {
  messages.sort(function(a, b) {
    return a.ts - b.ts;
  });
  return messages;
}
