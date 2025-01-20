console.log("client.js executing");

const socket = io();
let roomUniqueId = null;
let player1 = false;

const gameState = {
  currentRound: 1,
  maxRounds: 3,
  scores: {
    player1: 0,
    player2: 0,
  },
  roundComplete: false,
  gameComplete: false,
  resetInProgress: false,
};

function createGame() {
  player1 = true;
  resetGameState();
  socket.emit("createGame");
}

function joinGame() {
  roomUniqueId = document.getElementById("roomUniqueId").value;
  resetGameState();
  socket.emit("joinGame", { roomUniqueId: roomUniqueId });
}

function resetGameState() {
  gameState.currentRound = 1;
  gameState.scores = { player1: 0, player2: 0 };
  gameState.roundComplete = false;
  gameState.gameComplete = false;
  gameState.resetInProgress = false;

  updateScoreDisplay();
  updateRoundDisplay(1, gameState.maxRounds);

  document.getElementById("winnerArea").innerHTML = "";
  document.getElementById("roundStatus").textContent = "";
  document.getElementById("player1Choice").innerHTML = getDefaultButtons();
  document.getElementById("player2Choice").innerHTML = `
        <p id="opponentState">Waiting for opponent</p>
    `;
  document.getElementById("gameOverModal").style.display = "none";
}

function getDefaultButtons() {
  return `
        <button class="rock" onclick="sendChoice('Rock')">Stone</button>
        <button class="paper" onclick="sendChoice('Paper')">Paper</button>
        <button class="scissor" onclick="sendChoice('Scissor')">Scissors</button>
    `;
}

function handleRoundEnd(winner) {
  try {
    if (winner === "p1") {
      gameState.scores.player1++;
    }
    // ...
  } catch (error) {
    console.error("Error handling round end:", error);
    handleGameError("Failed to process round end");
  }
}

function startNextRound() {
  if (gameState.resetInProgress) return;

  gameState.currentRound++;
  gameState.roundComplete = false;

  updateRoundDisplay(gameState.currentRound, gameState.maxRounds);

  // Reset UI for the next round
  document.getElementById("player1Choice").innerHTML = getDefaultButtons();
  document.getElementById("player2Choice").innerHTML = `
        <p id="opponentState">Waiting for opponent</p>
    `;
}

function declareGameWinner() {
  gameState.gameComplete = true;

  const p1Score = gameState.scores.player1;
  const p2Score = gameState.scores.player2;

  let finalMessage = "";
  if (player1) {
    if (p1Score > p2Score)
      finalMessage = `You won the game! Final Score: ${p1Score} - ${p2Score}`;
    else if (p1Score < p2Score)
      finalMessage = `You lost the game! Final Score: ${p1Score} - ${p2Score}`;
    else finalMessage = `It's a draw! Final Score: ${p1Score} - ${p2Score}`;
  } else {
    if (p2Score > p1Score)
      finalMessage = `You won the game! Final Score: ${p2Score} - ${p1Score}`;
    else if (p2Score < p1Score)
      finalMessage = `You lost the game! Final Score: ${p2Score} - ${p1Score}`;
    else finalMessage = `It's a draw! Final Score: ${p2Score} - ${p1Score}`;
  }

  document.getElementById("finalScore").textContent = finalMessage;
  document.getElementById("gameOverModal").setAttribute("aria-hidden", "false");
  document.getElementById("gameOverModal").style.display = "block";
}

function getFinalWinnerMessage() {
  const p1Score = gameState.scores.player1;
  const p2Score = gameState.scores.player2;

  if (player1) {
    if (p1Score > p2Score)
      return `Game Over - You Win! Final Score: ${p1Score}-${p2Score}`;
    if (p1Score < p2Score)
      return `Game Over - You Lose! Final Score: ${p1Score}-${p2Score}`;
    return `Game Over - It's a Draw! Final Score: ${p1Score}-${p2Score}`;
  } else {
    if (p2Score > p1Score)
      return `Game Over - You Win! Final Score: ${p2Score}-${p1Score}`;
    if (p2Score < p1Score)
      return `Game Over - You Lose! Final Score: ${p2Score}-${p1Score}`;
    return `Game Over - It's a Draw! Final Score: ${p2Score}-${p1Score}`;
  }
}

function handleGameError(message) {
  alert(`Error: ${message}. Please refresh the page to restart.`);
}

socket.on("newGame", (data) => {
  roomUniqueId = data.roomUniqueId;

  // Create button with proper class
  let copyButton = document.createElement("button");
  copyButton.className = "copy-code-button";

  // Create span for button text
  let buttonText = document.createElement("span");
  buttonText.innerText = "Copy Code";
  copyButton.appendChild(buttonText);

  copyButton.addEventListener("click", async () => {
    try {
      // Add loading state
      copyButton.classList.add("loading");

      await navigator.clipboard.writeText(roomUniqueId);

      // Remove loading and add success state
      copyButton.classList.remove("loading");
      copyButton.classList.add("success");
      buttonText.innerText = "Copied!";

      // Reset button after 2 seconds
      setTimeout(() => {
        copyButton.classList.remove("success");
        buttonText.innerText = "Copy Code";
      }, 2000);
    } catch (err) {
      // Handle error state
      console.error("Async: Could not copy text: ", err);
      copyButton.classList.remove("loading");
      copyButton.classList.add("error");
      buttonText.innerText = "Failed to copy";

      // Reset button after 2 seconds
      setTimeout(() => {
        copyButton.classList.remove("error");
        buttonText.innerText = "Copy Code";
      }, 2000);
    }
  });

  // Update waiting area
  const waitingArea = document.getElementById("waitingArea");
  waitingArea.innerHTML = `Waiting for opponent, please share code ${roomUniqueId} to join`;
  waitingArea.appendChild(copyButton);
});

socket.on("playersConnected", () => {
  document.getElementById("initial").style.display = "none";
  document.getElementById("waitingArea").style.display = "none";
  document.getElementById("gameArea").style.display = "flex";
});

socket.on("p1Choice", (data) => {
  if (!player1) {
    createOpponentChoiceButton(data);
  }
});

socket.on("p2Choice", (data) => {
  if (player1) {
    createOpponentChoiceButton(data);
  }
});

socket.on("result", (data) => {
  try {
    if (gameState.roundComplete) return;

    let winnerText = "";
    if (data.winner !== "d") {
      if (data.winner === "p1" && player1) {
        winnerText = "Round Won!";
        gameState.scores.player1++;
      } else if (data.winner === "p1") {
        winnerText = "Round Lost!";
        gameState.scores.player1++;
      } else if (data.winner === "p2" && !player1) {
        winnerText = "Round Won!";
        gameState.scores.player2++;
      } else if (data.winner === "p2") {
        winnerText = "Round Lost!";
        gameState.scores.player2++;
      }
    } else {
      winnerText = `Round Draw!`;
    }

    document.getElementById("opponentState").style.display = "none";
    document.getElementById("opponentButton").style.display = "block";
    document.getElementById("winnerArea").innerHTML = winnerText;

    // Mark round as complete
    gameState.roundComplete = true;

    // Handle round end and proceed to next round or game end
    if (gameState.currentRound < gameState.maxRounds) {
      setTimeout(() => {
        startNextRound();
      }, 2000); // Delay before starting the next round
    } else {
      setTimeout(() => {
        declareGameWinner();
      }, 2000); // Delay before declaring the game winner
    }
  } catch (error) {
    console.error("Error processing game result:", error);
    handleGameError("Failed to process game result");
  }
});

function sendChoice(rpsValue) {
  try {
    if (gameState.roundComplete || gameState.gameComplete) return;

    const choiceEvent = player1 ? "p1Choice" : "p2Choice";
    socket.emit(choiceEvent, {
      rpsValue: rpsValue,
      roomUniqueId: roomUniqueId,
    });

    let playerChoiceButton = document.createElement("button");
    playerChoiceButton.style.display = "block";
    playerChoiceButton.classList.add(rpsValue.toString().toLowerCase());
    playerChoiceButton.innerText = rpsValue;
    document.getElementById("player1Choice").innerHTML = "";
    document.getElementById("player1Choice").appendChild(playerChoiceButton);
  } catch (error) {
    console.error("Error sending choice:", error);
    handleGameError("Failed to send choice");
  }
}

function createOpponentChoiceButton(data) {
  document.getElementById("opponentState").innerHTML = "Opponent made a choice";
  let opponentButton = document.createElement("button");
  opponentButton.id = "opponentButton";
  opponentButton.classList.add(data.rpsValue.toString().toLowerCase());
  opponentButton.style.display = "none";
  opponentButton.innerText = data.rpsValue;
  document.getElementById("player2Choice").appendChild(opponentButton);
}

function updateRoundDisplay(currentRound, maxRounds) {
  const roundDisplay = document.getElementById("roundDisplay");
  roundDisplay.textContent = `Round ${currentRound}/${maxRounds}`;
}

// Example usage:
updateRoundDisplay(1, 3);

function updateScoreDisplay() {
  const p1ScoreElement = document.getElementById("player1Score");
  const p2ScoreElement = document.getElementById("player2Score");

  if (p1ScoreElement) p1ScoreElement.textContent = gameState.scores.player1;
  if (p2ScoreElement) p2ScoreElement.textContent = gameState.scores.player2;
}

function exitGame() {
  window.location.href = "/goodbye.html"; // Redirect to the goodbye page
}
