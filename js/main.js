/*
  Evil global vars
*/
var zipOutput = $("#zip-output");
var zipContent = null;

/*
  zipObject: the JSZip ZipObject from the slack zip upload
*/
function processZip(zipObject) {
  zipContent = zipObject; // set global var
  zipContent.files["channels.json"].async('text').then(
    function success(content) {
      zipOutput.html(content);
    }
  );
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
