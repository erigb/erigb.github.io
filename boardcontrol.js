const GRID_MAX_X = 18;
const GRID_MAX_Y = 14;

function getUIComponents() {
    GameUI = {};
    GameUI.screen = document.querySelector("html");
    GameUI.difficulty = document.getElementById("difficulty");
    GameUI.timer = document.getElementById("dash-timer");
    GameUI.flag = document.getElementById("flag-cnt");
    GameUI.overlayScreen = document.getElementById("overlay");
    GameUI.overlayBtn = document.getElementById("playagain");
    GameUI.overlayText1 = document.getElementById("overlayText1");
    GameUI.overlayText2 = document.getElementById("overlayText2");
    return GameUI;
}