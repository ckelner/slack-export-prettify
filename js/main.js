/*
  Evil global vars
*/
var zipContent = null;
var channelData = {};
var channelIds = [];
var userData = {};
var chatDataComplete = false;
var progressPerct = 0;

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
    getChannelChat();
    fireWhenMessagesReady();
  } else  {
    setTimeout(fireWhenChannelsReady,500);
  }
}

function fireWhenMessagesReady() {
  var chatReady = true;
  // Fraught with error due to async nature - could only be half loaded
  channelIds.forEach(function(idObj) {
    if(channelData[idObj.id]["messages"].length <= 0) {
      chatReady = false;
    }
  });
  if(!jQuery.isEmptyObject(channelData) && !jQuery.isEmptyObject(userData)
    && chatReady) {
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
    updateProgressPercentage(1);
  }
}

/* channelJSON: JSON Object of `channels.json` from the Slack Zip */
function processChannels(channelJSON) {
  updateProgressPercentage(3);
  channelJSON.forEach(function(channel) {
    channelData[channel.id] = {
      "name": channel.name,
      "is_archived": channel.is_archived,
      "purpose": channel.purpose.value,
      "messages": [],
      "html": null
    };
    channelIds.push({"name": channel.name, "id": channel.id});
    updateProgressPercentage(1);
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
  updateProgressPercentage(2);
}

function getChannelChat() {
  channelIds.forEach(function(idObj) {
    zipContent.folder(channelData[idObj.id]["name"]).forEach(
      function (relativePath, file) {
        file.async('text').then(
          function success(content) {
            channelData[idObj.id]["messages"] =
              channelData[idObj.id]["messages"].concat(JSON.parse(content));
          }
        );
      }
    );
    updateProgressPercentage(0.5);
  });
}

function buildChannelChat() {
  for(var x=0, lenx=channelIds.length; x<lenx; x++) {
    var worker = new Worker('js/buildChat.js');
    worker.addEventListener('message', function(e) {
      channelData[e.data.channelId]["html"] = e.data.html;
    }, false);
    worker.postMessage({"channel": channelIds[x], "channelData": channelData[channelIds[x].id], "userData": userData});
    updateProgressPercentage(1);
  }
}

function displayChat() {
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
    updateProgressPercentage(0.25);
  });
  channelNav.append(bsListGrpChan);
  hideProgress();
  $("#zip-output").append(channelNav);
  $("#"+channelIds[0].id).trigger('click');
}

function displayChannelChat(link, channelId) {
  $("#zip-output").append(channelData[channelId]["html"]);
  $(".list-group-item").removeClass("active");
  $(link).addClass("active");
}

function showProgress() {
  $("#progress").show();
}

function hideProgress() {
  $("#progress").hide();
}

function updateProgressPercentage(value) {
  progressPerct += value;
  pbar = $("#progressbar");
  pbar.attr("aria-valuenow",progressPerct);
  pbar.css("width",progressPerct + "%");
  pbar.text(progressPerct + "%")
  console.log("Percent done: " + progressPerct);
}

function hideWelcome() {
  $("#welcome").hide();
}

(function(obj) {
  (function() {
    var fileInput = document.getElementById("file-input");
    fileInput.addEventListener('change', function() {
      showProgress();
      hideWelcome();
      JSZip.loadAsync(fileInput.files[0]).then(function(promise) {
        updateProgressPercentage(3);
        return promise;
      }).then(function onFulfill(content) {
        updateProgressPercentage(3);
        processZip(content);
      });
    }, false);
  })();
})(this);
