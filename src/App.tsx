// App.tsx
import React, { useState, useEffect } from "react";
import Grid from "./components/Grid";
import { Move, MoveType, PlayerType } from "./models/Player";
import "./styles.css";
import { GAMEBOARD_SIZE, ROW_LENGTH } from "./models/Constants";



const App: React.FC = () => {
  const [players, setPlayers] = useState<PlayerType[]>([{
    id: 1,
    name: "Player 1",
    position: 1,
    color: "red",
    diceRolls: 0,
    finished: false,
    moveHistory: [],
    movedSteps: 0,
  }]);
  const [ladders, setLadders] = useState<{ start: number; end: number }[]>([]);
  const [finishedMoving, setFinishedMoving] = useState<boolean>(true);
  const [diceRoll, setDiceRoll] = useState<string>('-');
  const [isRolling, setIsRolling] = useState(false);
  const [automaticMode, setAutomaticMode] = useState<boolean>(false);

  const getNewValidLadderPosition = (ladders: { start: number, end: number}[], isStart: boolean): number => {
    const key = isStart ? 'start' : 'end';
    for (let i = 0; i < 20; i++) {
      const value = Math.floor(Math.random() * GAMEBOARD_SIZE) + 1;
      // No edges
      // Not exist in existing ladders
      const currentExisting = ladders.map(ladder => ladder[key]);
      if (value !== 1 && value !== GAMEBOARD_SIZE && !currentExisting.includes(value)) {
        return value;
      }
    }
    console.log('Failed to get ladder');
    return -1;
  }

  const padPos = (number: number) => {
    if (number === 100) return number;
    if (number < 10) return `  ${number}`;
    else return ` ${number}`
  };

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--grid-rows", `${GAMEBOARD_SIZE / ROW_LENGTH}`);
    root.style.setProperty("--grid-columns", `${ROW_LENGTH}`);
  }, []);

  useEffect(() => {
    const generateLadders = () => {
      const ladders: { start: number, end: number}[] = [];
      for (let i = 0; i < 15; i++) {
        const start = getNewValidLadderPosition(ladders, true);
        const end = getNewValidLadderPosition(ladders, true);
        if (start !== end) {
          ladders.push({ start, end });
        }
      }
      ladders.sort((ladder1, ladder2) => ladder2.start - ladder1.start );
      return ladders;
    };
    setLadders(generateLadders());
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
  
    const runAutomaticMode = async () => {
      if (finishedMoving && automaticMode) {
        await rollDice(); // Ensures sequential execution
      }
      if (interval) clearTimeout(interval);
      interval = setTimeout(runAutomaticMode, 1500); // Recursively call after delay
    };
  
    if (automaticMode) {
      runAutomaticMode();
    }
  
    return () => {
      if (interval) clearTimeout(interval); // Cleanup on unmount or mode change
    };
  }, [automaticMode]);
  
  

  // Creates a new player in first position
  const createNewPlayer = () => {
    setPlayers((prevPlayers) => {
      if (!prevPlayers.find((player) => player.position === 1)) {
        const newColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        return [
          ...prevPlayers,
          { 
            id: prevPlayers.length + 1, name: `Player ${prevPlayers.length + 1}`, position: 1, 
            color: newColor, diceRolls: 0, finished: false, moveHistory: [], movedSteps: 0,
          },
        ];
      }
      return prevPlayers;
    });
  }

  const updatePlayer = async (playerIndex: number, updatePlayer: (player: PlayerType) => PlayerType) => {
    setPlayers((prevPlayers) => {
      const updatedPlayers = prevPlayers.map((player, index) => {
        if (index === playerIndex) {
          const updatedPlayer = updatePlayer(player);
          // console.log('DEBUG Updated player', updatedPlayer);
          return updatedPlayer
        }
        return player;
      });
      return updatedPlayers;
    });
  }

  const moveThePlayerForward = async (roll: number, playerIndex: number) => {
    for (let i = 0; i < roll; i++) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      // console.log('Move!');

      await updatePlayer(playerIndex, (player) => {
        // Move only the player that role the die
        const newPosition = Math.min(player.position + 1, GAMEBOARD_SIZE);
        return { ...player, position: newPosition, movedSteps: player.diceRolls + 1 }
      });
    }
  }


  const rollDice = async () => {
    // console.log('Rolling!')
    // Iterate over all active players and roll a unique die for all
    // They move one at a time.
    if (isRolling) return false;
    setFinishedMoving(false);
    for (let i = 0; i < players.length; i++) {
      const rollingPlayer = players[i];
      if (!rollingPlayer.finished) {
        // console.log('Player Rolling', rollingPlayer)!
        const fromPosition = rollingPlayer.position;

        // After each active player roll a die, simulate a move for all of them.
        const roll = Math.floor(Math.random() * 6) + 1;
        setIsRolling(true); // Trigger animation
        await new Promise((resolve) => setTimeout(resolve, 400));
        setDiceRoll(String(roll));
        await new Promise((resolve) => setTimeout(resolve, 600));
        setIsRolling(false); // Stop animation
        const expectedPosition = rollingPlayer.position + roll;
        await moveThePlayerForward(roll, i);

        // Now the dice role move is complete
        // Record the move

        await updatePlayer(i, (player) => {
          const newDiceRoll = player.diceRolls + 1;
          const move: Move = { from: fromPosition, dice: roll, to: player.position, moveNumber: newDiceRoll };
          const moveHistoryList = JSON.parse(JSON.stringify(player.moveHistory));
          moveHistoryList.push(move);
          return { ...player, diceRolls: newDiceRoll, moveHistory: moveHistoryList };
        });
        
        // Ladder movement
        const ladder = ladders.find((ladder) => ladder.start === expectedPosition);
        // console.log( ladder, expectedPosition);
        if (ladder) {
          // await new Promise((resolve) => setTimeout(resolve, 2000));
          await updatePlayer(i, (player) => {
            const move: Move = { from: player.position, moveType: MoveType.Ladder, to: ladder.end, moveNumber: player.diceRolls };
            player.moveHistory.push(move);
            return { ...player, position: ladder.end };
          });
        };
        
        console.log('Done with move!')
      }
    }

    // Player reaches the finishing line
    // Add a new player and mark player as finished
    setPlayers((prevPlayers) => {
      return prevPlayers.map((player) => {
        if (player.position === GAMEBOARD_SIZE && !player.finished) {
          createNewPlayer();
          return {
            ...player,
            finished: true,
          }
        }
        return player;
      });
    });
    setFinishedMoving(true);
  };

  return (
    <div className="grid-container">
      <h1>Shoots and Ladders</h1>
      <span style={{ display: "flex"}}>
        <Grid players={players} ladders={ladders} />
        <div>
          <button onClick={rollDice}>Roll Dice</button>
          <button onClick={() => setAutomaticMode(!automaticMode)}>
            {automaticMode ? "Turn OFF Automatic Mode" : "Turn ON Automatic Mode"}
          </button>
          <div
            className={`dice-display ${isRolling ? "rolling" : ""}`}
            style={{ fontSize: "52px", marginLeft: "50%" }}
          >
            {diceRoll}
          </div>
          <div className="scoreboard">
            <h2>Games</h2>
            {players.filter(player => player.finished).map((player, index) => (
              <div key={index} style={{ color: player.color }}>
                {`Name: ${player.name}, Dice Rolls: ${player.diceRolls}`}
              </div>
            ))}
            Playing:
            {players.filter(player => !player.finished).map((player, index) => (
              <div key={index} style={{ color: player.color }}>
                {`Name: ${player.name}, Dice Rolls: ${player.diceRolls}`}
                <div style = {{ display: "flex" , "flexDirection": "column"}}>
                  {player.moveHistory.map((move, moveIndex) => (
                    <div className="moveList" key={moveIndex} style={{ display: "block"}}>
                      {`${move.moveNumber}: ${padPos(move.from)} -> ${padPos(move.to)} ${move.dice ? `🎲${["", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"][move.dice]}` : ''}${move.moveType ? move.moveType : ''}`}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
        {ladders.map((ladder, index) => (
          <div key={index}>
            {`${ladder.start} -> ${ladder.end}`}
          </div>
        ))}
        </div>
      </span>
      
    </div>
  );
};

export default App;
