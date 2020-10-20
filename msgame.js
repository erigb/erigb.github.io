//The base game engine for this js code was provided by Pavol Federl.
//@ https://repl.it/@pfederl/Minesweeper-Game-Engine#msgame.js
"use strict";
window.addEventListener('load', main);
window.addEventListener('contextmenu', event => event.preventDefault());

/**
 * Game States
 * @enum {string}
 */
const GameState = {
  LOADING: 1,
  RUNNING: 2
}
Object.freeze(GameState);

//Sorry about these 3 as I am still not too great with js and resorted to the globals.
const grid = document.querySelector(".grid");
let tiles = [];
let gameRunner = {
    state: GameState.LOADING,
    UI: getUIComponents()
};

//This function will set up the MSGame.
function runGame() {
    switch (gameRunner.state) {
        case GameState.LOADING:
            newGameState();
            break;
        case GameState.RUNNING:
            break;
    }
}

function newGameState() {
    if (gameRunner.UI.difficulty.value === "Easy") {
        game.init(8, 10, 10);
    }
    else if (gameRunner.UI.difficulty.value === "Hard") {
        game.init(14, 18, 40);
    }

    // set game state: loading -> first click
    gameRunner.state = GameState.RUNNING;

    // run state machine
    runGame();
}

let MSGame = (function(){

  // private constants
  const STATE_HIDDEN = "hidden";
  const STATE_SHOWN = "shown";
  const STATE_MARKED = "marked";
  const tileDim = 40;

  function array2d( nrows, ncols, val) {
    const res = [];
    for( let row = 0 ; row < nrows ; row ++) {
      res[row] = [];
      for( let col = 0 ; col < ncols ; col ++)
        res[row][col] = val(row,col);
    }
    return res;
  }

  // returns random integer in range [min, max]
  function rndInt(min, max) {
    [min,max] = [Math.ceil(min), Math.floor(max)]
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  class _MSGame {
    constructor() {
      
    }

    validCoord(row, col) {
      return row >= 0 && row < this.nrows && col >= 0 && col < this.ncols;
    }

    init(nrows, ncols, nmines) {
      this.nrows = nrows;
      this.ncols = ncols;
      this.nmines = nmines;
      this.nmarked = 0;
      this.nuncovered = 0;
      this.exploded = false;
      gameRunner.UI.flag.innerText = "" + (this.nmines - this.nmarked);
      resetTimer();
      // create an array
      this.arr = array2d(
        nrows, ncols,
        () => ({mine: false, state: STATE_HIDDEN, count: 0}));

        grid.style.gridTemplateColumns = `repeat(${ncols}, 1fr)`;
        for( let i = 0 ; i < nrows*ncols ; i ++) {
          var colour = ((Math.floor(i / ncols) + i) % 2 === 0) ? '#0494F5' : '#0476C2';
            const tile = document.createElement("div");
            tile.setAttribute('id', i);
            tile.style.backgroundColor = colour;
            tile.className = "tile";
            grid.appendChild(tile);
            tile.addEventListener('click', () => {
             this.tileClickEvent(grid.children[i], true);
            });
            tile.addEventListener('contextmenu', () => {
              this.tileClickEvent(grid.children[i], false);
             }); 
          }
        

    }

    count(row,col) {
      const c = (r,c) =>
            (this.validCoord(r,c) && this.arr[r][c].mine ? 1 : 0);
      let res = 0;
      for( let dr = -1 ; dr <= 1 ; dr ++ )
        for( let dc = -1 ; dc <= 1 ; dc ++ )
          res += c(row+dr,col+dc);
      return res;
    }

    sprinkleMines(row, col) {
        // prepare a list of allowed coordinates for mine placement
      let allowed = [];
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(Math.abs(row-r) > 2 || Math.abs(col-c) > 2)
            allowed.push([r,c]);
        }
      }
      this.nmines = Math.min(this.nmines, allowed.length);
      for( let i = 0 ; i < this.nmines ; i ++ ) {
        let j = rndInt(i, allowed.length-1);
        [allowed[i], allowed[j]] = [allowed[j], allowed[i]];
        let [r,c] = allowed[i];
        this.arr[r][c].mine = true;
      }
      // erase any marks (in case user placed them) and update counts
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(this.arr[r][c].state == STATE_MARKED)
            this.arr[r][c].state = STATE_HIDDEN;
          this.arr[r][c].count = this.count(r,c);
        }
      }
      let mines = []; let counts = [];
      for(let row = 0 ; row < this.nrows ; row ++ ) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].mine ? "B" : ".";
        }
        s += "  |  ";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].count.toString();
        }
        mines[row] = s;
      }
      console.log("Mines and counts after sprinkling:");
      console.log(mines.join("\n"), "\n");
    }

    tileClickEvent(tile, leftclick = true) {
      let i = Number(tile.id);
      console.log("Tile", i);
      let row = Math.floor(i / this.ncols);
      let col = i % this.ncols;
      if (leftclick)  {
        let lose = this.uncover(row, col);
      }
      else  {
        this.mark(row, col)
      }
      this.getRendering();

      let isDone = this.getStatus();
      if (isDone.done)  this.endGame();
      console.log(isDone.done);
    }
    
  
    // uncovers a cell at a given coordinate
    // this is the 'left-click' functionality
    uncover(row, col) {
      console.log("uncover", row, col);
      // if coordinates invalid, refuse this request
      if( ! this.validCoord(row,col)) return false;
      // if this is the very first move, populate the mines, but make
      // sure the current cell does not get a mine
      if( this.nuncovered === 0)  {
        this.sprinkleMines(row, col);
        startTimer();
      }
      // if cell is not hidden, ignore this move
      if( this.arr[row][col].state !== STATE_HIDDEN) return false;
      // floodfill all 0-count cells
      const ff = (r,c) => {
        if( ! this.validCoord(r,c)) return;
        if( this.arr[r][c].state !== STATE_HIDDEN) return;
        this.arr[r][c].state = STATE_SHOWN;
        this.nuncovered ++;
        if( this.arr[r][c].count !== 0) return;
        ff(r-1,c-1);ff(r-1,c);ff(r-1,c+1);
        ff(r  ,c-1);         ;ff(r  ,c+1);
        ff(r+1,c-1);ff(r+1,c);ff(r+1,c+1);
      };
      ff(row,col);
      // have we hit a mine?
      if( this.arr[row][col].mine) {
        this.exploded = true;
      }
      return true;
    }

    // puts a flag on a cell
    // this is the 'right-click' or 'long-tap' functionality
    mark(row, col) {
      if( this.nuncovered !== 0)  {
        console.log("mark", row, col);
        // if coordinates invalid, refuse this request
        if( ! this.validCoord(row,col)) return false;
        // if cell already uncovered, refuse this
        console.log("marking previous state=", this.arr[row][col].state);
        if( this.arr[row][col].state === STATE_SHOWN) return false;

        if (this.nmines - this.nmarked < 1 && this.arr[row][col].state === STATE_HIDDEN) return false;
        // accept the move and flip the marked status
        this.nmarked += this.arr[row][col].state == STATE_MARKED ? -1 : 1;
        this.arr[row][col].state = this.arr[row][col].state == STATE_MARKED ?
          STATE_HIDDEN : STATE_MARKED;
        return true;
      }
      return false;
    }

    // returns array of strings representing the rendering of the board
    //      "H" = hidden cell - no bomb
    //      "F" = hidden cell with a mark / flag
    //      "M" = uncovered mine (game should be over now)
    // '0'..'9' = number of mines in adjacent cells

    getRendering() {
      const res = [];
      for( let row = 0 ; row < this.nrows ; row ++) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          let i = (this.ncols * row) + col;
          var colour = ((Math.floor(i / this.ncols) + i) % 2 === 0) ? '#0494F5' : '#0476C2';
          var colour2 = ((Math.floor(i / this.ncols) + i) % 2 === 0) ? '#d9b07e' : '#ca904a';
          const tile = grid.children[i];
          let a = this.arr[row][col];
          if( this.exploded && a.mine) {
             s += "M";
             tile.innerText = " ";
             tile.style.backgroundColor = "#ee0b00";

          }
          else if( a.state === STATE_HIDDEN) {
             s += "H";
             tile.innerText = " ";
             tile.style.backgroundColor = colour;
          }
          else if( a.state === STATE_MARKED) { 
            s += "F";
            tile.innerText = " ";
            tile.style.backgroundColor = "#010300";
          }
          else if( a.mine) {
            s += "M";
            tile.innerText = " ";
            tile.style.backgroundColor = colour;
        }
          else {
            s += a.count.toString();
            tile.style.backgroundColor = colour2;
            if (a.count.toString() === "0")  {
              tile.innerText = " ";
            }
            else  {
              tile.innerText = a.count.toString();
              tile.style.fontSize = "" + this.tileDim * 0.80 + "px";
            }
          }
        }
        res[row] = s;
      }
      gameRunner.UI.flag.innerText = "" + (this.nmines - this.nmarked);
      return res;
    }

    getStatus() {
      let done = this.exploded ||
          this.nuncovered === this.nrows * this.ncols - this.nmines;
      return {
        done: done,
        exploded: this.exploded,
        nrows: this.nrows,
        ncols: this.ncols,
        nmarked: this.nmarked,
        nuncovered: this.nuncovered,
        nmines: this.nmines
      }
    }

    endGame()  {
      stopTimer();
      if (this.exploded)  {
        gameRunner.UI.overlayScreen.classList.add("active");
        gameRunner.UI.overlayText1.innerText = "You Lost!";
        gameRunner.UI.overlayText2.innerText = "OH NO! You hit a bomb!";
        gameRunner.state = GameState.LOADING;
      }
      else {
        gameRunner.UI.overlayScreen.classList.add("active");
        gameRunner.UI.overlayText1.innerText = "You did it!";
        gameRunner.UI.overlayText2.innerText = "Great job on finding all the bombs! It only took you " + gameRunner.timeElapsed + " seconds!";
        gameRunner.state = GameState.LOADING;
      }
      
    }

    resetBoard()  {
      for (let t = this.nrows*this.ncols - 1; t >= 0; t --)  {
        grid.removeChild(grid.children[t]);
      }
    }
  }

  return _MSGame;

})();

function startTimer() {
  gameRunner.timeStart = new Date();
  gameRunner.timer = setInterval(function () { updateTimer(); }, 500);
}

function updateTimer() {
  let currentTime = new Date();
  gameRunner.timeElapsed = Math.floor((currentTime - gameRunner.timeStart) / 1000);
  document.getElementById("dash-timer").innerText = "" + gameRunner.timeElapsed;
}

function resetTimer() {
  clearInterval(gameRunner.timer);
  //game.timeElapsed = 0;
  gameRunner.timeStart = 0;
  gameRunner.UI.timer.innerText = "0";
}

function stopTimer()  {
  clearInterval(gameRunner.timer);
}


let game = new MSGame();
function main() {
  gameRunner.UI.difficulty.addEventListener("change", () => {
    gameRunner.state = GameState.LOADING;
    game.resetBoard();
    runGame();
  });

  gameRunner.UI.overlayBtn.addEventListener("click", () => {
    gameRunner.UI.overlayScreen.classList.remove("active");
    game.resetBoard();
    runGame();
});
    runGame();
}
