/*
  Evil global vars
*/
var zipContent = null;
var channelData = {};
var channelIds = [];
var userData = {};
var chatDataComplete = false;
var progressPerct = 0;
var currentChannelDisplayedId = null;
var channelFilesTotal = 0;
var channelFilesProcessed = 0;

/* zipObject: the JSZip ZipObject from the slack zip upload */
function processZip(zipObject) {
  zipContent = zipObject; // set global var
  var channelsTxt = null;
  zipContent.files["channels.json"].async('text').then(
    function success(content) {
      processChannels(JSON.parse(content));
    }
  );
  zipContent.files["users.json"].async('text').then(
    function success(content) {
      processUsers(JSON.parse(content));
    }
  );
  fireWhenChannelsReady();
}

function fireWhenChannelsReady() {
  if(!jQuery.isEmptyObject(channelData)) {
    countFilesInChannels();
    getChannelChat();
    fireWhenMessagesReady();
  } else  {
    setTimeout(fireWhenChannelsReady,500);
  }
}

function fireWhenMessagesReady() {
  if(!jQuery.isEmptyObject(channelData) && !jQuery.isEmptyObject(userData)
    && channelFilesProcessed == channelFilesTotal) {
    buildChannelChat();
    fireWhenHTMLReady();
  } else {
    setTimeout(fireWhenMessagesReady,500);
  }
}

function fireWhenHTMLReady() {
  var htmlRdy = true;
  // Fraught with error due to async nature - could only be half loaded
  channelIds.forEach(function(idObj) {
    if(channelData[idObj.id]["html"] == null) {
      htmlRdy = false;
    }
  });
  if(htmlRdy) {
    displayChat();
  } else {
    setTimeout(fireWhenHTMLReady,500);
  }
}

function countFilesInChannels() {
  Object.keys(zipContent.files).forEach(function(key,index) {
      if(key.indexOf("/") != -1 && key.indexOf(".json") != -1) {
        channelFilesTotal++;
      }
    }
  );
}

/* channelJSON: JSON Object of `channels.json` from the Slack Zip */
function processChannels(channelJSON) {
  channelJSON.forEach(function(channel) {
    channelData[channel.id] = {
      "name": channel.name,
      "is_archived": channel.is_archived,
      "purpose": channel.purpose.value,
      "messages": [],
      "html": null
    };
    channelIds.push({"name": channel.name, "id": channel.id});
  });
  channelIds.sort(function (a, b) {
    var nameA = a.name.toUpperCase();
    var nameB = b.name.toUpperCase();
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    // equal
    return 0;
  });
}

/* userJSON: JSON Object of `users.json` from the Slack Zip */
function processUsers(userJSON) {
  userJSON.forEach(function(user) {
    userData[user.id] = {
      "name": user.name,
      "color": user.color,
      "real_name": user.real_name,
      "avatar": user.profile.image_24
    }
  });
}

function getChannelChat() {
  channelIds.forEach(function(idObj) {
    zipContent.folder(channelData[idObj.id]["name"]).forEach(
      function (relativePath, file) {
        file.async('text').then(
          function success(content) {
            channelData[idObj.id]["messages"] =
              channelData[idObj.id]["messages"].concat(JSON.parse(content));
            channelFilesProcessed++;
          }, function error(e) {
            console.log("Error getting text for: " + e);
          }
        );
      }
    );
  });
}

function buildChannelChat() {
  for(var x=0, lenx=channelIds.length; x<lenx; x++) {
    var worker = new Worker('js/buildChat.js');
    worker.addEventListener('message', function(e) {
      channelData[e.data.channelId]["html"] = e.data.html;
      this.postMessage({"cmd": "stop"});
    }, false);
    worker.postMessage({"channel": channelIds[x], "channelData":
      channelData[channelIds[x].id], "userData": userData, "cmd": "process"});
  }
}

function putDatHTMLOnDaDomBomb() {
  // take the html we got for each channel and put it on the dom
  // so it can load quickly, cuz this shit full of hacks
  channelIds.forEach(function(idObj) {
    $("#zip-output").append(channelData[idObj.id]["html"]);
  });
}

function displayChat() {
  $("#zip-output").append(buildNav());
  putDatHTMLOnDaDomBomb();
  $("#"+channelIds[0].id).trigger('click');
  showChat();
  hideLoading();
  hideWelcome();
}

function buildNav() {
  var div = $('<div></div>');
  var anchor = $('<a></a>')
  var channelNav = div.clone().addClass("col-lg-2 col-md-2 col-sm-3 col-xs-4");
  var bsListGrpChan = div.clone().addClass("list-group");
  channelIds.forEach(function(idObj) {
    var channelLink = anchor.clone().addClass("list-group-item")
      .attr("id",idObj.id).text(channelData[idObj.id]["name"]);
    channelLink.click(function() {
      displayChannelChat(this, idObj.id);
    });
    bsListGrpChan.append(channelLink);
  });
  channelNav.append(bsListGrpChan);
  return channelNav;
}

function displayChannelChat(link, channelId) {
  $("#chat-" + channelId).removeClass("hideme");
  $("#chat-" + currentChannelDisplayedId).addClass("hideme");
  currentChannelDisplayedId = channelId;
  $(".list-group-item").removeClass("active");
  $(link).addClass("active");
}

function showLoading() {
  $("#loading").show();
}

function hideLoading() {
  $("#loading").hide();
}

function showChat() {
  $("#zip-output").removeClass("hideme");
}

function hideWelcome() {
  $("#welcome").hide();
}

(function(obj) {
  (function() {
    var fileInput = document.getElementById("file-input");
    fileInput.addEventListener('change', function() {
      showLoading();
      JSZip.loadAsync(fileInput.files[0]).then(function(promise) {
        return promise;
      }).then(function onFulfill(content) {
        processZip(content);
      });
    }, false);
  })();
})(this);
