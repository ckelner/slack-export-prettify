(function(obj) {
  (function() {
    var fileInput = document.getElementById("file-input");
    var zipOutput = $("#zip-output");
    fileInput.addEventListener('change', function() {
      JSZip.loadAsync(fileInput.files[0]).then(function(content) {
        return content.files["channels.json"].async('text');
      }).then(function (txt) {
         zipOutput.html(txt);
      });
    }, false);
  })();
})(this);
