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

/*
Opens the channel and user json objects from the zip and builds objects and
arrays from them for processing. Expects on arguement:
zipObject: the JSZip ZipObject from the slack zip upload
*/
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

/* waits until channel data is available before proceeding */
function fireWhenChannelsReady() {
  if(!jQuery.isEmptyObject(channelData)) {
    countFilesInChannels();
    getChannelChat();
    fireWhenMessagesReady();
  } else  {
    setTimeout(fireWhenChannelsReady,500);
  }
}

/* waits until message data is available before proceeding */
function fireWhenMessagesReady() {
  if(!jQuery.isEmptyObject(channelData) && !jQuery.isEmptyObject(userData)
    && channelFilesProcessed == channelFilesTotal) {
    buildChannelChat();
    fireWhenHTMLReady();
  } else {
    setTimeout(fireWhenMessagesReady,500);
  }
}

/*
Waits until HTML has been "built" by web workers and set on the channelData
object. See buildChannelChat() and buildChat.js
*/
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

/*
Gets the total number of files across all channels - used to determine if all channel message data has been asynchronously processed or not
*/
function countFilesInChannels() {
  Object.keys(zipContent.files).forEach(function(key,index) {
      if(key.indexOf("/") != -1 && key.indexOf(".json") != -1) {
        channelFilesTotal++;
      }
    }
  );
}

/*
Builds an object for each channel from the channel json in the zip then
orders these alphabetically. Expects one arguement:
channelJSON: JSON Object of `channels.json` from the Slack Zip
*/
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

/*
Builds an object for each user from the userjson in the zip. Expects one argument:
userJSON: JSON Object of `users.json` from the Slack Zip
*/
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

/*
Gets all messages from all channels in all folders in the zip asynchronously.
Because the zip contains a json for every day there were messages, this
function much process each json individually and concatenate it to the previous
one; however the "forEach" function on the JSZip Object does not guarentee these
to be in order by date. These messages get sorted by date later by the buildChat
web worker.
*/
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

/*
For each channel it spawns a buildChat.js web worker to process all messages
which build html strings to be displayed to the end user
*/
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

/*
Adds the html strings for each channels messages to the DOM for quicker loading.
Still fairly non-performant when messages total in the thousands.
*/
function putDatHTMLOnDaDomBomb() {
  // take the html we got for each channel and put it on the dom
  // so it can load quickly, cuz this shit full of hacks
  channelIds.forEach(function(idObj) {
    $("#zip-output").append(channelData[idObj.id]["html"]);
  });
}

/*
Utility function to call functions which append the channel navigation and
message html to the DOM. Triggers a click on the first channel in the
navigation. Calls function which hide the welcome instructions and loading divs.
*/
function displayChat() {
  $("#zip-output").append(buildNav());
  putDatHTMLOnDaDomBomb();
  $("#"+channelIds[0].id).trigger('click');
  showChat();
  hideLoading();
  hideWelcome();
}

/* Builds the channel navigation */
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

/*
The onclick function for each channel in the nav; hides the div for the channel messages that were being displayed, shows the channel messages for the clicked on channel and changes which channel is marked active in the nav.
*/
function displayChannelChat(link, channelId) {
  $("#chat-" + channelId).removeClass("hideme");
  $("#chat-" + currentChannelDisplayedId).addClass("hideme");
  currentChannelDisplayedId = channelId;
  $(".list-group-item").removeClass("active");
  $(link).addClass("active");
}

/* Utility functions for revealing and hiding elements */
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

/*
OnLoad function that creates a listener for file input selection which kicks
off processing.
*/
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
