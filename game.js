
kontra.init(document.getElementById("myCanvas"));

var mouseX = 0;
var mouseY = 0;

var mouseClicked = false;
var mouseReleased = false;

var pPressed = false;
var rPressed = false;

var catImage = new Image();
catImage.src = "imgs/cat1.jpeg";

var titleImage = new Image();
titleImage.src = "imgs/title.png";

var director = new GameDirector();
var grid = new GameGrid(128, 64, 6);
grid.newGrid(0);

var monitor = new GameMonitor(600, 200);

window.onload = function()  {
  kontra.canvas.addEventListener('mousemove', function(event)  {
    var rect = kontra.canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  document.body.onmouseup = function()  {
    mouseClicked = false;
    mouseReleased = true;
  }
  document.body.onmousedown = function()  {
    mouseClicked = true;
    mouseReleased = false;
  }
  window.onkeyup = function(e) {
    if(e.keyCode == 80) {
      pPressed = false;
    } else if(e.keyCode == 82)  {
      rPressed = false;
    }
  }
  window.onkeydown = function(e) {
    if(e.keyCode == 80) {
      pPressed = true;
    } else if(e.keyCode == 82)  {
      rPressed = true;
    }
  }
}

var loop = kontra.gameLoop({
  update() {  
    director.update();
    grid.flowUpdate();
  },
  render() {
    grid.render();
    monitor.render();

    kontra.context.drawImage(titleImage, 600, 32, 256, 128);
  }
});

function GameGrid(xOffset, yOffset, rowCols) {
  //All of the grid items
  this.grid = [];
  //Beginning index
  this.startIndex = 0;
  //Ending index
  this.endIndex = 0;

  this.gridActive = false;

  this.xOffset = xOffset;
  this.yOffset = yOffset;

  this.sinInput = 0;
  this.draggingStatus = false;
  this.draggingGridIndex = -1;
  this.draggingOffset = {
    xOffset: 0,
    yOffset: 0
  }

  this.flowIndex = -1;
  this.flowFill = 0;
  this.prefillWidth = 0;
  this.speedMultiplier = 1;
  this.flowSpeed = 0.1;

  this.startGrid = function() {
    this.gridActive = true;
    this.newGrid();
    this.flowSpeed = 0.2;

    this.flowIndex = -1;
    this.flowFill = 0;
    this.prefillWidth = 0;
    this.speedMultiplier = 1;
  }

  this.stopGrid = function() {
    this.gridActive = false;

    if(this.draggingStatus) {
      if(this.grid[this.draggingGridIndex].fillAmount > 0)  {
        this.draggingStatus = false;
        this.draggingGridIndex = -1;
        this.draggingOffset = {
          xOffset: 0,
          yOffset: 0
        }
      }
    }
  }

  this.increaseSpeed = function() {
    this.flowSpeed += 0.1;
  }

  this.flowUpdate = function()  {
    if(this.gridActive) {
      if(this.flowIndex == -1)  {
        if(this.flowFill < 100) {
          this.flowFill += 0.08;
          //Y = (X-A)/(B-A) * (D-C) + C
          this.prefillWidth = (this.flowFill - 0) / (100 - 0) * (384 - 0) + 0;
        } else {
          if(this.grid[this.startIndex].hidden) {
            //Start piece is hidden
            //game over!
            director.endGame(false);
          } else {
            if(this.grid[this.startIndex].checkFlow(3)) {
              //Start flow on the starting index
              this.flowIndex = this.startIndex;
              this.flowFill = 0;
              monitor.updateState(2);
            } else {
              //Starting piece is in the wrong orientation
              //game over!
              director.endGame(false);
            }
          }
        }
      } else {
        var j = this.flowIndex;
        if(this.grid[j].fillAmount < 100) {
          //Continue flow on the current index
          this.grid[j].fillAmount += this.flowSpeed * this.speedMultiplier;
        } else {
          var next = this.grid[j].getNextIndex(j, this.endIndex);
          if(next == -1)  {
            //Next index is out of bounds
            //game over!
            director.endGame(false);
          } else if(next == -2) {
            //finished!
            director.levelProgress();
          }
          else {
            if(this.grid[next].pieceType == 2)  {
              //Next piece is a blocking piece
              //game over!
              director.endGame(false);
            } else if(this.grid[next].hidden) {
              //Next piece is hidden
              //game over!
              director.endGame(false);
            } else {
              var endflow = this.grid[j].checkEndFlow();
              if(this.grid[next].checkFlow(endflow))  {
                this.flowIndex = next;
              } else {
                //Can't begin flow on the next index
                //game over!
                director.endGame(false);
              }
            }
          }
        }
      }
    }
  }

  this.newGrid = function() {

    this.grid = [];

    this.draggingStatus = false;
    this.draggingGridIndex = -1;
    this.draggingOffset = {
      xOffset: 0,
      yOffset: 0
    }

    this.flowFill = 0;
    this.flowIndex = -1;
    this.prefillWidth = 0;
    this.speedMultiplier = 1;

    var startIndex = Math.floor(Math.random() * 6);
    var endIndex = (rowCols * rowCols) - Math.floor(Math.random() * 6);
    var generated = generateGrid(startIndex, endIndex);
    while(generated == null)  {
      startIndex = Math.floor(Math.random() * 6);
      endIndex = (rowCols * rowCols) - Math.floor(Math.random() * 6);
      generated = generateGrid(startIndex, endIndex);
    }

    this.startIndex = startIndex;
    this.endIndex = endIndex;

    for(var x = 0; x < rowCols; x++)  {
      for(var y = 0; y < rowCols; y++)  {
        var piece = generated[x * rowCols + y];
        this.grid.push(new GridSpace(x * 64 + this.xOffset, y * 64 + this.yOffset, piece.rotation, piece.pieceType));
      }
    }
  }

  this.render = function()  {
    var cursor = "default";
    var ctx = kontra.context;
    ctx.font = "48px Trebuchet MS";
    
    //Background/border for the game grid
    ctx.beginPath();
    roundRect(ctx, this.xOffset - 16, this.yOffset - 32, 408, 424, 4)
    ctx.fillStyle = "#393E41";
    ctx.fill();
    
    if(!this.gridActive)  {
      //Just draw the grid spaces
      for(var i = 0; i < this.grid.length; i++) {
        this.grid[i].render();
      }
    } else {
      for(var i = 0; i < this.grid.length; i++) {
        if(this.draggingGridIndex != i)  {
          this.grid[i].render();
        }
        var xx = this.grid[i].x,
            yy = this.grid[i].y;

        if(mouseX > xx && mouseX < xx + 64) {
          if(mouseY > yy && mouseY < yy + 64) {

            if(this.grid[i].hidden) {
              //Hovering code for hidden grid spaces
              ctx.beginPath();
              ctx.rect(xx, yy, 64, 64);

              var alpha = Math.abs(Math.sin(this.sinInput)) * 0.75;
              ctx.fillStyle = "rgba(252, 255, 85," + alpha + ")";
              ctx.fill();
              cursor = "pointer";

              //Check to unhide spaces
              if(mouseClicked)  {
                mouseClicked = false;
                if(this.grid[i].hidden) {
                  this.grid[i].hidden = false;
                }
              }
            } else if(this.draggingGridIndex != i) {
                if(this.grid[i].pieceType != 2 && this.grid[i].fillAmount == 0) {
                //Hovering code for unhidden, undragged, unblocking, and unfilled grid spaces

                ctx.beginPath();
                ctx.rect(xx, yy, 64, 64);

                var alpha = Math.abs(Math.sin(this.sinInput)) * 0.75;
                ctx.fillStyle = "rgba(252, 255, 85," + alpha + ")";
                ctx.fill();
                cursor = "pointer";

                //Begin dragging this piece
                if(mouseClicked)  {
                  mouseClicked = false;

                  this.draggingStatus = true;

                  this.draggingGridIndex = i;
                  this.draggingOffset.xOffset = mouseX - this.grid[i].x,
                  this.draggingOffset.yOffset = mouseY - this.grid[i].y
                }
                //Check if dragging to swap the pieces
                if(mouseReleased) {
                  if(this.draggingStatus) {
                    mouseReleased = false;

                    //Swap the two pieces
                    var rot = this.grid[i].rotation,
                        piece = this.grid[i].pieceType,
                        j = this.draggingGridIndex;

                    this.grid[i].rotation = this.grid[j].rotation;
                    this.grid[i].pieceType = this.grid[j].pieceType;

                    this.grid[j].rotation = rot;
                    this.grid[j].pieceType = piece;

                    this.draggingStatus = false;
                    this.draggingGridIndex = -1;
                    this.draggingOffset = {
                      xOffset: 0,
                      yOffset: 0
                    }
                  }
                }
              }
            }
          }
          this.sinInput += 0.001;
        }
      }

      //Draw the current dragging piece
      if(this.draggingStatus) {
        if(this.grid[this.draggingGridIndex].fillAmount > 0)  {
          this.draggingStatus = false;
          this.draggingGridIndex = -1;
          this.draggingOffset = {
            xOffset: 0,
            yOffset: 0
          }
        } else {
          cursor = "pointer";
          //If the mouse gets released and it's not over a grid space
          if(mouseReleased) {
            mouseReleased = false;

            this.draggingStatus = false;
            this.draggingGridIndex = -1;
            this.draggingOffset = {
              xOffset: 0,
              yOffset: 0
            }
          } else {
            switch(this.grid[this.draggingGridIndex].pieceType)  {
              case 0:
                showBentPiece(mouseX - this.draggingOffset.xOffset, mouseY - this.draggingOffset.yOffset, this.grid[this.draggingGridIndex].rotation, 0, 0);
              break;
              case 1:
                showStraightPiece(mouseX - this.draggingOffset.xOffset, mouseY - this.draggingOffset.yOffset, this.grid[this.draggingGridIndex].rotation, 0, 0);
              break;
            }
          }
        }
      }
      //roundRect(ctx, this.xOffset, 470, 128, 32, 4);
      if(mouseX > 128 && mouseX < 265)  {
        if(mouseY > 470 && mouseY < 502)  {
          cursor = "pointer";
          if(mouseClicked)  {
            mouseClicked = false;
            this.speedMultiplier = 45;
          }
        }
      }
    }

    //Set the cursor
    document.body.style.cursor = cursor;
    var xx = this.grid[this.startIndex].x,
        yy = this.grid[this.startIndex].y;

    //Draw the start block
    ctx.beginPath();
    ctx.rect(xx - 16, yy + 16, 16, 32);
    ctx.fillStyle = "#92CDD3";
    ctx.fill();
    
    //Draw the left top and bottom curved pieces
    ctx.beginPath();
    ctx.moveTo(xx - 16, yy + 24);
    ctx.quadraticCurveTo(xx - 40, yy + 24, xx - 40, yy + 48);
    ctx.lineTo(xx - 24, yy + 48);
    ctx.quadraticCurveTo(xx - 24, yy + 40, xx - 16, yy + 40);
    ctx.closePath();
    ctx.fill();

    var rot = Math.PI;
    ctx.translate(this.xOffset - 64, 512);
    ctx.rotate(rot);

    ctx.beginPath();
    ctx.moveTo(0 - 16, 0 + 24);
    ctx.quadraticCurveTo(0 - 40, 0 + 24, 0 - 40, 0 + 48);
    ctx.lineTo(0 - 24, 0 + 48);
    ctx.quadraticCurveTo(0 - 24, 0 + 40, 0 - 16, 0 + 40);
    ctx.closePath();
    ctx.fill();

    ctx.rotate(-rot);
    ctx.translate(-(this.xOffset - 64), -512);

    //Draw the left cable
    ctx.beginPath();
    ctx.moveTo(xx - 40, yy + 48);
    ctx.lineTo(xx - 40, 465);
    ctx.lineTo(xx - 24, 465);
    ctx.lineTo(xx - 24, yy + 48);
    ctx.closePath();
    ctx.fill();

    //Draw the left horizontal cable
    ctx.beginPath();
    ctx.rect(0, 472, 80, 16);
    ctx.fill();

    //Draw the start arrow
    ctx.beginPath();
    ctx.moveTo(xx - 16, yy + 16);
    ctx.lineTo(xx - 16, yy + 48);
    ctx.lineTo(xx, yy + 32);
    ctx.closePath();
    ctx.fillStyle = "#ffff00";
    ctx.fill();

    xx = this.grid[this.endIndex].x,
    yy = this.grid[this.endIndex].y;

    //Draw the end block
    ctx.beginPath();
    ctx.rect(xx + 64, yy + 16, 16, 32);
    ctx.fillStyle = "#92CDD3";
    ctx.fill();

    // //Draw the right top and bottom curved pieces
    ctx.beginPath();
    ctx.moveTo(xx + 64 + 16, yy + 24);
    ctx.quadraticCurveTo(xx + 64 + 40, yy + 24, xx + 64 + 40, yy + 48);
    ctx.lineTo(xx + 64 + 24, yy + 48);
    ctx.quadraticCurveTo(xx + 64 + 24, yy + 40, xx + 64 + 16, yy + 40);
    ctx.closePath();
    ctx.fill();

    var rot = (Math.PI * 0.5) * 3;
    ctx.translate(xx + 64, 448);
    ctx.rotate(rot);

    ctx.beginPath();
    ctx.moveTo(0 - 16, 0 + 24);
    ctx.quadraticCurveTo(0 - 40, 0 + 24, 0 - 40, 0 + 48);
    ctx.lineTo(0 - 24, 0 + 48);
    ctx.quadraticCurveTo(0 - 24, 0 + 40, 0 - 16, 0 + 40);
    ctx.closePath();
    ctx.fill();

    ctx.rotate(-rot);
    ctx.translate(-(xx + 64), -448);

    //Draw the right cable
    ctx.beginPath();
    ctx.moveTo(xx + 64 + 40, yy + 48);
    ctx.lineTo(xx + 64 + 40, 465);
    ctx.lineTo(xx + 64 + 24, 465);
    ctx.lineTo(xx + 64 + 24, yy + 48);
    ctx.closePath();
    ctx.fill();

    //Draw the right horizontal cable to the monitor
    ctx.beginPath();
    ctx.rect(560, 472, 64, 16);
    ctx.fill();

    //Draw the end arrow
    ctx.beginPath();
    ctx.moveTo(xx + 64, yy + 16);
    ctx.lineTo(xx + 64, yy + 48);
    ctx.lineTo(xx + 64 + 16, yy + 32);
    ctx.closePath();
    ctx.fillStyle = "#ffff00";
    ctx.fill();

    //Draw the speed button
    ctx.beginPath();
    roundRect(ctx, this.xOffset, 470, 128, 32, 4);
    ctx.fillStyle = "#E2C24F";
    ctx.fill();
    ctx.font = "24px Trebuchet MS";
    ctx.fillStyle = "#000000";
    ctx.fillText("Speed Up", this.xOffset + 16, 500);

    //Draw the pre-fill bar
    ctx.beginPath();
    ctx.rect(this.xOffset, 56, this.prefillWidth, 8);//384 is full width
    ctx.fillStyle = "lime";
    ctx.fill();
    
    //Pre-fill bar text
    ctx.font = "16px Courier New";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("Prefill", this.xOffset, 50);
  }
}

function GridSpace(x, y, rotation, pieceType) {
  this.x = x;
  this.y = y;
  this.rotation = rotation;
  //0 straight, 1 bent, 2 blockage
  this.pieceType = pieceType;
  this.fillAmount = 0;
  this.flowDirection = 0; 
  this.hidden = true;

  if(this.pieceType == 1) {
    if(this.rotation > 1) {
      this.rotation = Math.round(Math.random());
    }
  }
  
  this.getNextIndex = function(myIndex, endIndex)  {
    var endflow = this.checkEndFlow();

    switch(endflow) {
      case 0:
        //ending on 2
        if(myIndex + 1 < 36 && (myIndex + 1) % 6 != 0)  {
          return (myIndex + 1);
        }
      break;
      case 1:
        //ending on 3
        if(myIndex - 6 > 0) {
          return (myIndex - 6);
        }
      break;
      case 2:
        //ending on 0
        if(myIndex - 1 >= 0 && myIndex % 6 != 0) {
          return (myIndex - 1);
        }
      break;
      case 3:
        //ending on 1
        if(myIndex == endIndex) {
          return -2;
        } else if(myIndex + 6 < 36)  {
          return (myIndex + 6);
        }
      break;
    }
    return -1;
  }
  
  //Returns the next starting side
  this.checkEndFlow = function() {
    switch(this.pieceType)  {
      case 0:
        switch(this.rotation) {
          case 0:
            if(this.flowDirection == 0)  {
              return 2;
            } else {
              return 3;
            }
          break;
          case 1:
            if(this.flowDirection == 0)  {
              return 3;
            } else {
              return 0;
            }
          break;
          case 2:
            if(this.flowDirection == 0)  {
              return 0;
            } else {
              return 2;
            }
          break;
          case 3:
            if(this.flowDirection == 0)  {
              return 1;
            } else {
              return 2;
            }
          break;
        }
      break;
      case 1:
        if(this.rotation == 0)  {
          if(this.flowDirection == 0)  {
            return 2;
          } else {
            return 0;
          }
        } else {
          if(this.flowDirection == 0)  {
            return 1;
          } else {
            return 3;
          }
        }
      break;
    }
    return -1;
  }
  
  //Checks if flow is possible from a side and sets direction
  this.checkFlow = function(startSide) {
    switch(this.pieceType)  {
      case 0:
        switch(this.rotation) {
          case 0:
            if(startSide == 0)  {
              this.flowDirection = 1;
              return true;
            } else if(startSide == 1) {
              this.flowDirection = 0;
              return true;
            }
          break;
          case 1:
            if(startSide == 1)  {
              this.flowDirection = 1;
              return true;
            } else if(startSide == 2) {
              this.flowDirection = 0;
              return true;
            }
          break;
          case 2:
            if(startSide == 2)  {
              this.flowDirection = 1;
              return true;
            } else if(startSide == 3) {
              this.flowDirection = 0;
              return true;
            }
          break;
          case 3:
            if(startSide == 3)  {
              this.flowDirection = 1;
              return true;
            } else if(startSide == 0) {
              this.flowDirection = 0;
              return true;
            }
          break;
        }
      break;
      case 1:
        if(this.rotation == 0)  {
          if(startSide == 0)  {
            this.flowDirection = 1;
            return true;
          } else if(startSide == 2) {
            this.flowDirection = 0;
            return true;
          }
        } else {
          if(startSide == 1)  {
            this.flowDirection = 0;
            return true;
          } else if(startSide == 3) {
            this.flowDirection = 1;
            return true;
          }
        }
      break;
    }
    return false;
  }
  
  this.render = function()  {
    var ctx = kontra.context;
    if(this.hidden) {
      //Fill the background
      ctx.beginPath();
      ctx.rect(this.x, this.y, 64, 64);
      ctx.fillStyle = "#393E41";
      ctx.fill();

      ctx.beginPath();
      ctx.rect(this.x + 4, this.y + 4, 56, 56);
      ctx.fillStyle = "#D3D0CB";
      ctx.fill();

      ctx.fillStyle = "#393E41";
      ctx.fillText("?", this.x + 24, this.y + 50);
    } else {
      switch(this.pieceType)  {
        case 0:
          showBentPiece(this.x, this.y, this.rotation, this.flowDirection, this.fillAmount);
        break;
        case 1:
          showStraightPiece(this.x, this.y, this.rotation, this.flowDirection, this.fillAmount);
        break;
        case 2:
          showBlockingPiece(this.x, this.y);
        break;
      }
    }
  }
}

function GameDirector() {
  //Game States
  //0 - waiting to start (when the page first loads)
  //1 - game running
  //2 - game over, waiting for restart
  this.gameState = 0;
  this.level = 0;

  this.update = function()  {
    if(pPressed)  {
      pPressed = false;
      if(this.gameState == 0) {
        this.startGame();
      }
    } else if(rPressed) {
      rPressed = false;
      if(this.gameState == 2) {
        this.startGame();
      }
    }
  }

  this.startGame = function() {
    this.level = 0;
    this.gameState = 1;
    monitor.updateState(1);
    monitor.updateLevel(0);
    grid.startGrid();
  }

  this.levelProgress = function() {
    this.level++;
    if(this.level == 5) {
      monitor.updateLevel(this.level);
      this.endGame(true);
    } else {
      monitor.updateState(1);
      monitor.updateLevel(this.level);
      grid.stopGrid();
      grid.startGrid();
    }
  }

  this.endGame = function(won) {
    this.gameState = 2;
    //Update monitor
    if(won) {
      monitor.updateState(3);
    } else {
      monitor.updateState(4);
    }
    grid.stopGrid();
  }
}

function GameMonitor(x, y)  {
  this.x = x;
  this.y = y;
  this.ellipsisProgress = 0;
  this.ellipsisTicks = 0;
  this.level = 0;

  //0 - waiting on game to start for the first time
  //1 - prefill, starting download...
  //2 - downloading...
  //3 - downloaded! (won)
  //4 - Game Over (lost)
  this.state = 0;
  
  this.updateState = function(state)  {
    this.state = state;
    this.ellipsisTicks = 0;
    this.ellipsisProgress = 0;
  }

  this.updateLevel = function(level) {
    this.level = level;
  }

  this.render = function()  {

    var ctx = kontra.context;
    
    //Render the output screen
    ctx.beginPath();
    roundRect(ctx, this.x - 16, this.y - 16, 364, 316, 4);
    ctx.fillStyle = "#E2C24F";
    ctx.fill();

    ctx.beginPath();
    roundRect(ctx, this.x + 16, this.y + 16, 300, 256, 4);
    ctx.fillStyle = "white";
    ctx.fill();
    
    //Draw the cat image
    ctx.drawImage(catImage, this.x + 75, this.y + 56, 192, 168);

    //Draw the cat image's cover
    var heightSub = 33.6 * this.level;
    ctx.beginPath();
    ctx.rect(this.x + 75, this.y + 56, 192, 168 - heightSub);
    ctx.fillStyle = "white";
    ctx.fill();

    ctx.fillStyle = "#2e2e2e";
    ctx.fillText("Download Progress " + this.level + "/5", this.x + 24, this.y + 32);

    ctx.font = "24px Courier New";
    
    switch(this.state)  {
      case 0:
        ctx.fillStyle = "#2e2e2e";
        ctx.fillText("Press [p] to start!", this.x + 36, this.y + 265);
      break;
      case 1:
        var ellipsis = "";
        var steps = 0;
        while(steps < this.ellipsisProgress)  {
          ellipsis += ".";
          steps++;
        }
        ctx.fillStyle = "#2e2e2e";
        ctx.fillText("Starting Download" + ellipsis, this.x + 24, this.y + 265);

        this.ellipsisTicks++;
        if(this.ellipsisTicks >= 25)  {
          this.ellipsisProgress++;
          this.ellipsisTicks = 0;
          if(this.ellipsisProgress > 3)  {
            this.ellipsisProgress = 0;
          }
        }
      break;
      case 2:
        var ellipsis = "";
        var steps = 0;
        while(steps < this.ellipsisProgress)  {
          ellipsis += ".";
          steps++;
        }
        ctx.fillStyle = "#2e2e2e";
        ctx.fillText("Downloading" + ellipsis, this.x + 24, this.y + 265);

        this.ellipsisTicks++;
        if(this.ellipsisTicks >= 25)  {
          this.ellipsisProgress++;
          this.ellipsisTicks = 0;
          if(this.ellipsisProgress > 3)  {
            this.ellipsisProgress = 0;
          }
        }
      break;
      case 3:
        ctx.fillStyle = "#2e2e2e";
        ctx.fillText("Downloaded!", this.x + 36, this.y + 265);
      break;
      case 4:
        ctx.fillStyle = "#2e2e2e";
        ctx.fillText("Connecting failed...", this.x + 24, this.y + 245);
        ctx.fillText("Press [r] to reset.", this.x + 24, this.y + 265);
      break;
    }
  }
}

function Computer(x, y)  {
  this.x = x;
  this.y = y;
  this.mouth = 0;

  this.render = function()  {
    var x = this.x,
        y = this.y;

    var ctx = kontra.context;
    ctx.beginPath();
    ctx.rect(x + 32, y + 150, 160, 32);
    ctx.fillStyle = "#424242";
    ctx.fill();
    
    roundRect(ctx, x, y, 220, 165, 4);
    ctx.fillStyle = "#393E41";
    ctx.fill();
    
    roundRect(ctx, x + 16, y + 16, 188, 133, 4);
    ctx.fillStyle = "white";
    ctx.fill();
    
    roundRect(ctx, x + 16, y + 16, 188, 133, 4);
    ctx.strokeStyle = "#424242";
    ctx.stroke();

    // ctx.beginPath();
    // ctx.rect(x - 8, y + 185, 243, 60);
    // ctx.strokeStyle = "#8A8A8A";
    // ctx.stroke();

    // ctx.beginPath();
    // ctx.rect(x + 140, y + 190, 80, 4);
    // ctx.rect(x + 140, y + 200, 80, 4);
    // ctx.rect(x + 140, y + 210, 80, 4);
    // ctx.fillStyle = "#424242";
    // ctx.fill();

    ctx.beginPath();

    ctx.rect(x + 78, y + 46, 16, 32);
    ctx.rect(x + 126, y + 46, 16, 32);
    ctx.fillStyle = "#F1F1F1";
    ctx.fill();

    ctx.beginPath();
    //Two eyes
    var rad = Math.atan2(mouseY - (62 + y), mouseX - (86 + x));
    if(rad < 0) {
      rad += Math.PI * 2;
    }
    var xx = Math.cos(rad) * 4,
        yy = Math.sin(rad) * 4;

    ctx.rect(x + 82 + xx, y + 50 + yy, 8, 24);

    rad = Math.atan2(mouseY - (62 + y), mouseX - (134 + x));
    if(rad < 0) {
      rad += Math.PI * 2;
    }
    xx = Math.cos(rad) * 4,
    yy = Math.sin(rad) * 4;

    ctx.rect(x + 130 + xx, y + 50 + yy, 8, 24);

    ctx.fillStyle = "#353535";
    ctx.fill();

    //Mouth
    if(this.mouth == 0) {
      ctx.beginPath();
      ctx.rect(x + 86, y + 120, 48, 4);
      ctx.fillStyle = "#353535";
      ctx.fill();
    } else if(this.mouth == 1) {
      ctx.beginPath();
      ctx.moveTo(x + 76, y + 120);
      ctx.quadraticCurveTo(x + 110, y + 135, x + 86 + 58, y + 120);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#353535";
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + 76, y + 120);
      ctx.quadraticCurveTo(x + 110, y + 105, x + 86 + 58, y + 120);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#353535";
      ctx.stroke();
    }
  }
}

function showStraightPiece(x, y, rotation, flowDirection, fillAmount)  {
  var width = 64;
  var height = 64;
  var ctx = kontra.context;

  //Y = (X-A)/(B-A) * (D-C) + C
  fillAmount = (fillAmount - 0) / (100 - 0) * (width - 0) + 0;
  
  //Fill the background
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.fillStyle = "#E5F3F6";
  ctx.fill();

  var thickness = 16;
  if(rotation)  {
    //Draw the liquid
    ctx.beginPath();
    if(flowDirection) {
      ctx.rect(x, y, fillAmount, height);
    } else {
      ctx.rect(x + width, y, -fillAmount, height);
    }
    ctx.fillStyle = "lime";
    ctx.fill();

    //Draw the first half
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + thickness);
    ctx.lineTo(x, y + thickness);

    //Draw the second half
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width, y + height - thickness);
    ctx.lineTo(x, y + height - thickness);

    //Fill the shapes
    ctx.fillStyle = "#191919";
    ctx.fill();

    //Draw the reflection
    ctx.beginPath();
    ctx.rect(x, y + height - thickness - 4, width, -8);
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fill();
  } else {
    //Draw the liquid
    ctx.beginPath();
    if(flowDirection) {
      ctx.rect(x, y, width, fillAmount);
    } else {
      ctx.rect(x, y + height, width, -fillAmount);
    }
    ctx.fillStyle = "lime";
    ctx.fill();

    //Draw the first half
    ctx.beginPath();
    ctx.moveTo(x, y)
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + thickness, y + height);
    ctx.lineTo(x + thickness, y);

    //Draw the second half
    ctx.moveTo(x + width, y);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width - thickness, y + height);
    ctx.lineTo(x + width - thickness, y);

    //Fill the shapes
    ctx.fillStyle = "#191919";
    ctx.fill();

    //Draw the reflection
    ctx.beginPath();
    ctx.rect(x + width - thickness - 4, y, -8, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fill();
  }

  //Draw four lines around the square
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x + width, y);
  ctx.closePath();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function showBentPiece(x, y, rotation, flowDirection, fillAmount)  {
  var width = 64;
  var height = 64;
  var ctx = kontra.context;
  
  //Y = (X-A)/(B-A) * (D-C) + C
  fillAmount = (fillAmount - 0) / (100 - 0) * (0 - 0.5) + 0.5;

  //Fill the background
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.fillStyle = "#E5F3F6";
  ctx.fill();

  var rot = 0;
  var xx = x, yy = y;

  var flowForward = 0; //0 full, 0.5 empty
  var flowBackward = 0; //0 full, 0.5 empty 

  if(flowDirection) {
    flowForward = fillAmount;
  } else {
    flowBackward = fillAmount;
  }

  //Setup the rotation and translation variables
  switch(rotation)  {
    case 1:
      rot = Math.PI / 2;
      xx = x + width;
    break;
    case 2:
      rot = (Math.PI / 2) * 2;
      xx = x + width;
      yy = y + height;
    break;
    case 3:
      rot = (Math.PI / 2) * 3;
      yy = y + height;
    break;
  }

  //Rotate and translate
  ctx.translate(xx, yy);
  ctx.rotate(rot);

  //Draw the liquid portions
  ctx.beginPath();
  ctx.arc(width, 0, width, Math.PI * (0.5 + flowForward)/* + 0.5 = empty*/, Math.PI * (1 - flowBackward) /* - 0.5 = empty */);
  ctx.stroke();
  ctx.lineTo(width, 0);

  ctx.closePath();
  ctx.fillStyle = "lime";
  ctx.fill();

  var thickness = 16;
  //Draw the first half
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, height);
  ctx.lineTo(width, height);
  ctx.lineTo(width, height - thickness);
  ctx.bezierCurveTo(height, height - thickness, thickness, height - thickness, thickness, 0);
  ctx.closePath();

  //Draw the second half
  ctx.moveTo(width, 0);
  ctx.lineTo(width, thickness);
  ctx.bezierCurveTo(width - thickness, thickness, width - thickness, 0, width - thickness, 0);
  ctx.closePath();

  //Fill the shapes
  ctx.fillStyle = "#191919";
  ctx.fill();

  //Draw the reflection
  ctx.beginPath();
  ctx.moveTo(thickness + 10, 8);
  ctx.bezierCurveTo(thickness + 10, 8, thickness + 10, height - thickness - 10, width - 8, height - thickness - 10);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 8;
  ctx.stroke();

  //Undo the rotation and translation
  ctx.rotate(-rot);
  ctx.translate(-xx, -yy);

  //Draw four lines around the square
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x + width, y);
  ctx.closePath();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function showBlockingPiece(x, y)  {
  var width = 64;
  var height = 64;
  var ctx = kontra.context;

  ctx.beginPath();
  ctx.rect(x, y, width, height);

  ctx.fillStyle = "#191919";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x + 8, y + 8);
  ctx.lineTo(x + width - 8, y + height - 8);
  ctx.moveTo(x + 8, y + height - 8);
  ctx.lineTo(x + width - 8, y + 8);

  ctx.strokeStyle = "#FF1D1D";
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x + width, y);
  ctx.closePath();

  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + radius + width, y);
  ctx.quadraticCurveTo(x + radius + width + radius, y, x + radius + width + radius, y + radius);
  ctx.lineTo(x + radius + width + radius, y + radius + height);
  ctx.quadraticCurveTo(x + radius + width + radius, y + radius + height + radius, x + radius + width, y + radius + height + radius);
  ctx.lineTo(x + radius, y + radius + height + radius);
  ctx.quadraticCurveTo(x, y + radius + height + radius, x, y + radius + height);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function generateGrid(start, finish) {
  //Initialize and setup the grid
  var localGrid = [];
  var rowCols = 6;

  for(var i = 0; i < rowCols * rowCols; i++)  {
    var block = false;
    if(Math.random() < 0.4 && i != start && i != finish)  {
      block = true;
    }
    localGrid.push({
      blocking: block,
      visited: false,
      parent: -1
    });
  }

  //An array of grid indexes to be searched
  var openSet = [start];
  
  while(openSet.length > 0) {
    var current = openSet.shift();
    if(localGrid[current].visited || localGrid[current].blocking) {
      continue;
    }

    localGrid[current].visited = true;
    
    //Check for solution here
    if(current === finish) {
      //console.log("Found solution");
      
      //Return array of indexes as a path
      var path = [];
      path.push(current);
      
      var p = localGrid[current].parent;
      while(p != start) {
        path.push(p);
        p = localGrid[p].parent;
      }
      path.push(start);

      var pathPieces = [];
      for(var i = 0; i < path.length; i++)  {
        if(i == 0) {
          //The first path piece, the finish
          var diff = path[i] - path[i + 1];
          if(diff == 1) {
            //Spot is above
            pathPieces.push({
              pieceType: 0,
              rotation: 0
            });
          } else if(diff == -1) {
            //Spot is below
            pathPieces.push({
              pieceType: 0,
              rotation: 1
            });
          } else if(diff == 6)  {
            //Spot is to the left
            pathPieces.push({
              pieceType: 1,
              rotation: 1
            });
          } 
        } else if(i == path.length - 1) {
          //The last path piece, the start
          var diff = path[i] - path[i - 1];
          if(diff == 1) {
            //Spot is above
            pathPieces.push({
              pieceType: 0,
              rotation: 3
            });
          } else if(diff == -1) {
            //Spot is below
            pathPieces.push({
              pieceType: 0,
              rotation: 2
            });
          } else if(diff == -6) {
            //Spot is to the right
            pathPieces.push({
              pieceType: 1,
              rotation: 1
            });
          }
        } else {
          var diffForward = path[i] - path[i + 1];
          var diffReverse = path[i] - path[i - 1];
          if(diffForward == 1) {
            //Spot is above, open 0
            if(diffReverse == -1)  {
              //open 0, 2
              pathPieces.push({
                pieceType: 1,
                rotation: 0
              });
            } else if(diffReverse == 6)  {
              //open 0, 3
              pathPieces.push({
                pieceType: 0,
                rotation: 3
              });
            } else if(diffReverse == -6)  {
              //open 0, 1
              pathPieces.push({
                pieceType: 0,
                rotation: 0
              });
            }
          } else if(diffForward == -1) {
            //Spot is below, open 2
            if(diffReverse == 1)  {
              //open 2, 0
              pathPieces.push({
                pieceType: 1,
                rotation: 0
              });
            } else if(diffReverse == 6)  {
              //open 2, 3
              pathPieces.push({
                pieceType: 0,
                rotation: 2
              });
            } else if(diffReverse == -6)  {
              //open 2, 1
              pathPieces.push({
                pieceType: 0,
                rotation: 1
              }); 
            }
          } else if(diffForward == 6)  {
            //Spot is to the left, open 3
            if(diffReverse == 1)  {
              //open 3, 0
              pathPieces.push({
                pieceType: 0,
                rotation: 3
              }); 
            } else if(diffReverse == -1)  {
              //open 3, 2
              pathPieces.push({
                pieceType: 0,
                rotation: 2
              }); 
            } else if(diffReverse == -6)  {
              //open 3, 1
              pathPieces.push({
                pieceType: 1,
                rotation: 1
              });
            }
          } else if(diffForward == -6) {
            //Spot is to the right, open 1
            if(diffReverse == 1)  {
              //open 1, 0
              pathPieces.push({
                pieceType: 0,
                rotation: 0
              }); 
            } else if(diffReverse == -1)  {
              //open 1, 2
              pathPieces.push({
                pieceType: 0,
                rotation: 1
              });
            } else if(diffReverse == 6)  {
              //open 1, 3
              pathPieces.push({
                pieceType: 1,
                rotation: 1
              });
            } 
          }
        }
      }

      //Scramble the pieces
      var scrambled = [];
      while(pathPieces.length > 0)  {
        var index = Math.round(Math.random() * (pathPieces.length - 1));
        scrambled.push(pathPieces[index]);
        pathPieces.splice(index, 1);
      }
      pathPieces = scrambled;

      //Build the results
      var result = [];

      for(var i = 0; i < localGrid.length; i++) {
        if(localGrid[i].blocking) {
          //Push a blocking piece for this index
          result.push({
            pieceType: 2,
            rotation: 0
          });
        } else {
          //Otherwise add one of the path pieces
          if(pathPieces.length > 0) {
            //Random chance of adding a random piece instead of a path piece
            if(Math.random() < 0.25) {
              result.push({
                pieceType: Math.round(Math.random()),
                rotation: Math.round(Math.random() * 3)
              });
            } else {
              var space = pathPieces.shift();
              result.push({
                pieceType: space.pieceType,
                rotation: space.rotation
              });
            }
          } else {
            //Add a random piece and rotation if not adding a path piece
            result.push({
              pieceType: Math.round(Math.random()),
              rotation: Math.round(Math.random() * 3)
            });
          }
        }
      }
      return result;
    }
    
    //Add neighbors
    //Add left neighbor
    var currentNeighbor = current - rowCols;
    if(currentNeighbor >= 0)  {
      if(!localGrid[currentNeighbor].blocking && !localGrid[currentNeighbor].visited) {
        openSet.push(currentNeighbor);
        localGrid[currentNeighbor].parent = current;
      }
    }
    //Add right neighbor
    currentNeighbor = current + rowCols;
    if(currentNeighbor < localGrid.length)  {
      if(!localGrid[currentNeighbor].blocking && !localGrid[currentNeighbor].visited) {
        openSet.push(currentNeighbor);
        localGrid[currentNeighbor].parent = current;
      }
    }
    //Add below neighbor
    currentNeighbor = current + 1;
    if(currentNeighbor < localGrid.length && currentNeighbor % rowCols != 0) {
      if(!localGrid[currentNeighbor].blocking && !localGrid[currentNeighbor].visited) {
        openSet.push(currentNeighbor);
        localGrid[currentNeighbor].parent = current;
      }
    }
    //Add above neighbor
    currentNeighbor = current - 1;
    if(currentNeighbor >= 0 && (currentNeighbor + 1) % rowCols != 0) {
      if(!localGrid[currentNeighbor].blocking && !localGrid[currentNeighbor].visited) {
        openSet.push(currentNeighbor);
        localGrid[currentNeighbor].parent = current;
      }
    }
  }
  //console.log("No solution");
  return null;
}

loop.start();
