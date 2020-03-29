import { PublicAPI } from "../../js-src/public-api";
import { SourceAPI } from "../../js-src/source-api";
import { public_path } from "../../js-src/public-path";

window.RufflePlayer = PublicAPI.negotiate(window.RufflePlayer, "local", new SourceAPI("local"));
//__webpack_public_path__ = public_path(window.RufflePlayer.config, "local");

import("./swf_lib.json").then(({default: root_obj}) => {
    const list = document.getElementById("sample-swfs");
    root_obj.swfs.forEach(item => {
        let temp = document.createElement("option");
        temp.innerHTML = item.title;
        temp.setAttribute("value",item.location);
        list.appendChild(temp);
    });
});

let ruffle;
let player;
let container = document.getElementById('main');

window.addEventListener('DOMContentLoaded', (event) => {
  ruffle = window.RufflePlayer.newest();
  player = ruffle.create_player();
  container.appendChild(player);
});

let sampleFileInput = document.getElementById("sample-swfs");
if(sampleFileInput) {
    sampleFileInput.addEventListener("change",sampleFileSelected,false);
}

let localFileInput = document.getElementById("local-file");
if (localFileInput) {
    localFileInput.addEventListener("change", localFileSelected, false);
}

if (window.location.search && window.location.search != "") {
    let urlParams = new URLSearchParams(window.location.search);
    let url = urlParams.get("file");
    if (url && url != "") {
        console.info(url);
        loadRemoteFile(url);
    }
}

function sampleFileSelected() {
    let selected_value = sampleFileInput.children[sampleFileInput.selectedIndex].value;
    if (selected_value != "none") {
        localFileInput.value = null;
        loadRemoteFile(selected_value);
    }
    else {
        replacePlayer()
    }
}

function localFileSelected() {
    sampleFileInput.selectedIndex = 0;
    let file = localFileInput.files[0];
    if (file) {
        let fileReader = new FileReader();
        fileReader.onload = e => {
            player.play_swf_data(fileReader.result);
        }
        fileReader.readAsArrayBuffer(file);
    }
}

function loadRemoteFile(url) {
    fetch(url)
        .then(response => {
            response.arrayBuffer().then(data => player.play_swf_data(data))
        });
}

let timestamp = 0;
let animationHandler;

function replacePlayer() {
    document.getElementById("main").children[0].remove();
    player = ruffle.create_player();
    container.appendChild(player);
}