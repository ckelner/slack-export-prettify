/*
  Evil global vars
*/
var zipContent = null;
var channelData = {};
var channelIds = [];
var userData = {};

/*
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
  //buildChannelChat();
  displayData();
}

function displayData() {
  if(!jQuery.isEmptyObject(channelData)) { // && jQuery.isEmptyObject(userData)
    displayChannels();
  } else {
    setTimeout(displayData,500);
  }
}

/*
  channelJSON: JSON Object of `channels.json` from the Slack Zip
*/
function processChannels(channelJSON) {
  channelJSON.forEach(function(channel) {
    channelData[channel.id] = {
      "name": channel.name,
      "is_archived": channel.is_archived,
      "purpose": channel.purpose.value
    };
    channelIds.push(channel.id);
  });
}

/*
  userJSON: JSON Object of `users.json` from the Slack Zip
*/
function processUsers(userJSON) {
  userJSON.forEach(function(channel) {

  });
}

function buildChannelChat() {
  // TODO
}

function displayChannels() {
  var channelHeaders = ['Name','Archived','Purpose'];
  var table = $('<table></table>').addClass('table table-striped');
  var tr = $('<tr></tr>');
  var th = $('<th></th>');
  var td = $('<td></td>');
  var header = tr.clone();
  //fill header row
  channelHeaders.forEach(function(d) {
    header.append(th.clone().text(d));
  });
  table.append($('<thead></thead>').append(header));
  var tbody = $('<tbody></tbody>');
  //fill out the table body
  channelIds.forEach(function(id) {
    var row = tr.clone();
    row.append(td.clone().text(channelData[id]["name"])); // name
    row.append(td.clone().text(channelData[id]["is_archived"])); // is_archived
    row.append(td.clone().text(channelData[id]["purpose"])); // purpose
    tbody.append(row);
  });
  table.append(tbody);
  table.DataTable({
    paging: false,
    "order": [[ 1, 'asc' ],[ 0, 'asc' ]]
  });
  $("#zip-output").append(table);
  $("#welcome").hide();
}

/*
  Adds onchange watcher to file input form, loads the zip, and kicks off
  processing the zip
*/
(function(obj) {
  (function() {
    var fileInput = document.getElementById("file-input");
    fileInput.addEventListener('change', function() {
      JSZip.loadAsync(fileInput.files[0]).then(function(promise) {
        return promise;
      }).then(function onFulfill(content) {
        processZip(content);
      });
    }, false);
  })();
})(this);
