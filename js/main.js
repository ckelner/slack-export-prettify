/*
  Evil global vars
*/
var zipContent = null;

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
}

/*
  channelJSON: JSON Object of `channels.json` from the Slack Zip
*/
function processChannels(channelJSON) {
  var channelHeaders = ['Name','Archived','Purpose'];
  var channelData = [];
  channelJSON.forEach(function(channel) {
    channelData.push([
      channel.name,
      channel.is_archived,
      channel.purpose.value
    ]);
  });
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
  channelData.forEach(function(d) {
    var row = tr.clone();
    d.forEach(function(e, j) {
      row.append(td.clone().text(e));
    });
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
