function createEditor(element, file, type) {

  //post
  function httpPostProcessRequest() {
    if (xmlHttp.readyState == 4) {
      if (xmlHttp.status != 200) {
        alert("ERROR[" + xmlHttp.status + "]: " + xmlHttp.responseText);
      }
    }
  }
  function httpPost(filename, data, type) {
    xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = httpPostProcessRequest;
    var formData = new FormData();
    formData.append("data", new Blob([data], {
      type: type
    }), filename);
    xmlHttp.open("POST", "/api/fs");
    xmlHttp.send(formData);
  }
  //get
  function httpGetProcessRequest() {
    if (xmlHttp.readyState == 4) {
      document.getElementById("preview").style.display = "none";
      document.getElementById("editor").style.display = "block";
      if (xmlHttp.status == 200) editor.update(xmlHttp.responseText);
      else editor.update("");
    }
  }
  function httpGet(theUrl) {
    xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = httpGetProcessRequest;
    xmlHttp.open("GET", theUrl, true);
    xmlHttp.send(null);
  }

  function getLangFromFilename(file){
    return /(?:\.([^.]+))?$/.exec(file)[1];
  }

  if (typeof file === "undefined") {
    file = "/js/main.js";
  }

  var lang = getLangFromFilename(file);

  type = type || "text/" + lang;

  var xmlHttp = null;
  var editor = new CodeFlask();
  editor.run(element, {
    language: lang
  });
  document.addEventListener("keydown", function(e) {
    if (e.keyCode == 83 && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
      e.preventDefault();
      editor.save();
    }
  }, false);

  httpGet(file);
  editor.load = function(filename) {
    file = filename;
    lang = getLangFromFilename(file);
    type = "text/" + lang;
    // if (lang !== "plain") editor.getSession().setMode("ace/mode/" + lang);
    httpGet(file);
  }
  editor.save = function() {
    httpPost(file, editor.textarea.value, type);
  }
  return editor;
}
