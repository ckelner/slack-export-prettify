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
    fireWhenAllReady();
  } else  {
    setTimeout(fireWhenChannelsReady,500);
  }
}

function fireWhenAllReady() {
  var chatReady = true;
  // Fraught with error due to async nature - could only be half loaded
  channelIds.forEach(function(idObj) {
    if(channelData[idObj.id]["messages"].length == 0) {
      chatReady = false;
    }
  });
  if(!jQuery.isEmptyObject(channelData) && !jQuery.isEmptyObject(userData)
    && chatReady) {
    buildChannelChat();
    displayChat();
  } else {
    setTimeout(fireWhenAllReady,500);
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
      "messages": []
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
  channelIds.forEach(function(idObj) {
    var div = $('<div></div>');
    var channelChat = div.clone().addClass("col-lg-10 col-md-10 col-sm-9 col-xs-6");
    var header = div.clone().addClass("table-responsive");
    header.html(
      "<table class='table'><tr><td class='channelheadertd'>" +
      "<h2 class='channelheader'>" +
        idObj.name +
      "</h2></td>" +
      "<td class='channelheadertd'><h4 class='channelpurpose'>" +
        channelData[idObj.id]["purpose"] +
      "</h4></td><td class='channelheadertd'><b class='channelarchived'>" +
        "[Archived: " + channelData[idObj.id]["is_archived"] +
      "]</b></td></tr></table>"
    );
    channelChat.append(header);
    /*var tableWrapper = div.clone().addClass("table-responsive");
    channelData[idObj.id]["messages"].forEach(function(msg) {
      var table = $('<table></table>');//.addClass('table table-striped');
      var tr = $('<tr></tr>');
      var td = $('<td></td>');
      var tbody = $('<tbody></tbody>');

      var row = tr.clone();
      row.append(td.clone().text(channelData[id]["name"])); // name
      row.append(td.clone().text(channelData[id]["is_archived"])); // is_archived
      row.append(td.clone().text(channelData[id]["purpose"])); // purpose
      tbody.append(row);
      table.append(tbody);
      table.DataTable({
        paging: false,
        "order": [[ 1, 'asc' ],[ 0, 'asc' ]]
      });
    });*/
    updateProgressPercentage(2);
    channelData[idObj.id]["html"] = channelChat;
  });
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
