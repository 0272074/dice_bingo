/**
 * Dice Bingo Game Logic
 */

class DiceBingo {
    constructor() {
        this.boardSize = 5;
        this.maxTurns = 25;
        this.resetGame();

        // DOM Elements
        this.dom = {
            dice1: document.getElementById('dice1'),
            dice2: document.getElementById('dice2'),
            diceSum: document.getElementById('dice-sum'),
            // rollBtn: document.getElementById('roll-btn'), // Removed
            // rollBtn: document.getElementById('roll-btn'), // Removed
            instruction: document.getElementById('instruction-text'),
            // turnIndicator: document.getElementById('turn-indicator'), // Removed
            // board: document.getElementById('bingo-board'), // Removed
            totalScore: document.getElementById('total-score'),
            scoreList: document.getElementById('score-list'),
            modal: document.getElementById('game-over-modal'),
            finalScore: document.getElementById('final-score'),
            restartBtn: document.getElementById('restart-btn'),
            modalRestartBtn: document.getElementById('modal-restart-btn'),
        };

        // Bind Events
        // this.dom.rollBtn.addEventListener('click', () => this.rollDice());
        this.dom.restartBtn.addEventListener('click', () => this.setupNewGame());
        this.dom.modalRestartBtn.addEventListener('click', () => {
            this.dom.modal.classList.add('hidden');
            this.setupNewGame();
        });

        // High Score Elements
        this.dom.rankingList = document.getElementById('ranking-list');
        this.dom.highscoreSection = document.getElementById('highscore-input-section');
        this.dom.playerNameInput = document.getElementById('player-name');
        this.dom.saveScoreBtn = document.getElementById('save-score-btn');
        this.dom.gameOverButtons = document.getElementById('game-over-buttons');

        this.dom.saveScoreBtn.addEventListener('click', () => this.saveHighScore());
        this.dom.playerNameInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
        });

        this.ranking = this.loadRanking();
        this.updateRankingUI();

        this.ranking = this.loadRanking();
        this.updateRankingUI();

        // Initialize Game
        this.setupNewGame();
    }

    // ... (resetGame, setupNewGame, setupBoardUI, updateBoardUI, updateUIReset etc.)

    loadRanking() {
        const stored = localStorage.getItem('diceBingoRanking');
        return stored ? JSON.parse(stored) : [];
    }

    saveRanking() {
        localStorage.setItem('diceBingoRanking', JSON.stringify(this.ranking));
    }

    updateRankingUI() {
        this.dom.rankingList.innerHTML = '';
        const displayData = [...this.ranking];
        // Fill up to 5
        while (displayData.length < 5) {
            displayData.push({ name: '---', score: '-' });
        }

        displayData.slice(0, 5).forEach(entry => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${entry.name}</span> <span style="float:right; font-weight:bold;">${entry.score}</span>`;
            this.dom.rankingList.appendChild(li);
        });
    }

    checkHighScore(score) {
        // Check if score qualifies for top 5
        // If less than 5 entries, yes.
        // If 5 entries, must be higher than lowest.
        if (this.ranking.length < 5) return true;
        return score > this.ranking[this.ranking.length - 1].score;
    }

    handleGameOver() {
        this.dom.instruction.innerText = 'ゲーム終了！';
        // this.dom.rollBtn.disabled = true;
        this.dom.finalScore.innerText = this.totalScore;

        // Hide/Show sections based on high score
        if (this.checkHighScore(this.totalScore)) {
            this.dom.highscoreSection.classList.remove('hidden');
            this.dom.gameOverButtons.classList.add('hidden'); // Hide restart until saved
            this.dom.playerNameInput.value = '';
            this.dom.playerNameInput.focus();
        } else {
            this.dom.highscoreSection.classList.add('hidden');
            this.dom.gameOverButtons.classList.remove('hidden');
        }

        setTimeout(() => {
            this.dom.modal.classList.remove('hidden');
        }, 500);
    }

    saveHighScore() {
        const name = this.dom.playerNameInput.value;
        if (name.length !== 2) {
            alert('名前を2文字のアルファベットで入力してください');
            return;
        }

        const newEntry = { name: name, score: this.totalScore };
        this.ranking.push(newEntry);
        this.ranking.sort((a, b) => b.score - a.score);
        this.ranking = this.ranking.slice(0, 5); // Keep top 5

        this.saveRanking();
        this.updateRankingUI();

        // UI Feedback and Transition
        this.dom.highscoreSection.classList.add('hidden');
        this.dom.gameOverButtons.classList.remove('hidden');
    }
    resetGame() {
        this.board = Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill(null));
        this.turnCount = 1;
        this.currentDiceSum = null;
        this.isWaitingForPlacement = false;
        this.totalScore = 0;
    }

    setupNewGame() {
        this.resetGame();
        this.setupBoardUI(); // Create board DOM
        this.updateUIReset();
        this.updateBoardUI(); // Clear board visual state
        // Auto-roll start
        setTimeout(() => this.rollDice(), 500);
    }

    setupBoardUI() {
        const grid = document.getElementById('grid-container');
        grid.innerHTML = '';

        // We need to generate 5 rows. 
        // For each row: 
        //   Col 1: Spacer (or Diag Score for last row)
        //   Col 2-6: Cells
        //   Col 7: Row Score

        // Wait, Grid Layout handles positioning. We just append elements in order?
        // CSS Grid autoflow is row-based.
        // So we need: 
        // Row 1: [Spacer] [C1] [C2] [C3] [C4] [C5] [RowScore1]
        // ...
        // Row 5: [Spacer] ... [RowScore5]
        // Row 6: [DiagScore2] [ColScore1] ... [ColScore5] [DiagScore1]

        this.cells = []; // Store cell refs for easy access [r][c]
        this.scoreBoxes = {
            rows: [],
            cols: [],
            diag1: null, // TL-BR
            diag2: null  // TR-BL
        };

        // Create Rows 1-5
        for (let r = 0; r < this.boardSize; r++) {
            // 1. Left Sidebar Item
            const leftSpacer = document.createElement('div');
            // Only Row 5 (index 4) might technically need the Diag2 score if we put it at Bottom-Left (Row 6, Col 1)
            // But in our CSS grid plan:
            // grid-template-rows: repeat(5, 1fr) 50px;
            // So items will flow.

            // Actually, simpler to just append all items and let grid place them if we are careful,
            // or Just use precise flow.

            // Left Column (Spacer for rows 0-4)
            grid.appendChild(leftSpacer);

            // Cells (Cols 2-6)
            this.cells[r] = [];
            for (let c = 0; c < this.boardSize; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;

                // Identify Diagonal
                if (r === c) cell.classList.add('diagonal'); // TL-BR
                if (r + c === 4) cell.classList.add('diagonal'); // TR-BL
                if (r === 2 && c === 2) cell.classList.add('center'); // Center

                cell.addEventListener('click', () => this.handleCellClick(r, c));
                grid.appendChild(cell);
                this.cells[r][c] = cell;
            }

            // Right Column (Row Score)
            const rowScore = document.createElement('div');
            rowScore.classList.add('score-box');
            rowScore.innerText = '-';
            this.scoreBoxes.rows.push(rowScore);
            grid.appendChild(rowScore);
        }

        // Create Row 6 (Bottom Indicators)
        // 1. Bottom-Left (Diag 2 Score: TR-BL) -> Wait, TR starts top right, ends Bottom Left. Correct.
        const diag2Score = document.createElement('div');
        diag2Score.classList.add('score-box', 'diagonal-score');
        diag2Score.innerText = '-';
        this.scoreBoxes.diag2 = diag2Score;
        grid.appendChild(diag2Score);

        // 2. Col Scores
        for (let c = 0; c < this.boardSize; c++) {
            const colScore = document.createElement('div');
            colScore.classList.add('score-box');
            colScore.innerText = '-';
            this.scoreBoxes.cols.push(colScore);
            grid.appendChild(colScore);
        }

        // 3. Bottom-Right (Diag 1 Score: TL-BR)
        const diag1Score = document.createElement('div');
        diag1Score.classList.add('score-box', 'diagonal-score');
        diag1Score.innerText = '-';
        this.scoreBoxes.diag1 = diag1Score;
        grid.appendChild(diag1Score);
    }

    updateBoardUI() {
        // Use styled classes stored in setup
        const allCells = document.querySelectorAll('.cell');
        allCells.forEach(cell => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            const val = this.board[r][c];

            // Keep base classes (cell, diagonal, center)
            // Remove interactive classes
            cell.classList.remove('filled', 'clickable', 'just-filled');
            cell.innerText = '';

            if (val !== null) {
                cell.classList.add('filled');
                cell.innerText = val;
            } else if (this.isWaitingForPlacement) {
                cell.classList.add('clickable');
            }
        });
    }

    updateUIReset() {
        this.dom.diceSum.innerText = '?';
        this.dom.dice1.src = 'images/dice1.svg';
        this.dom.dice2.src = 'images/dice1.svg'; // Default
        this.dom.totalScore.innerText = '0';
        this.dom.scoreList.innerHTML = '';
        this.dom.scoreList.innerHTML = '';
        this.dom.instruction.innerText = '準備中...';
        // this.dom.rollBtn.disabled = false;
        this.dom.restartBtn.classList.remove('hidden');
        // this.updateTurnIndicator();

        // Reset score boxes
        if (this.scoreBoxes) {
            this.scoreBoxes.rows.forEach(box => box.innerText = '-');
            this.scoreBoxes.cols.forEach(box => box.innerText = '-');
            if (this.scoreBoxes.diag1) this.scoreBoxes.diag1.innerText = '-';
            if (this.scoreBoxes.diag2) this.scoreBoxes.diag2.innerText = '-';
        }
    }

    updateTurnIndicator() {
        // Removed
        // this.dom.turnIndicator.innerText = `${this.turnCount} / ${this.maxTurns} 回目`;
    }

    rollDice() {
        if (this.isWaitingForPlacement) return;

        // Simple animation effect
        // this.dom.rollBtn.disabled = true;
        let rolls = 0;
        const maxRolls = 10;
        const interval = setInterval(() => {
            const d1 = Math.floor(Math.random() * 6) + 1;
            const d2 = Math.floor(Math.random() * 6) + 1;
            this.dom.dice1.src = `images/dice${d1}.svg`;
            this.dom.dice2.src = `images/dice${d2}.svg`;
            rolls++;
            if (rolls >= maxRolls) {
                clearInterval(interval);
                this.finalizeRoll(d1, d2);
            }
        }, 50);
    }

    finalizeRoll(d1, d2) {
        this.currentDiceSum = d1 + d2;
        this.dom.diceSum.innerText = this.currentDiceSum;
        this.isWaitingForPlacement = true;
        this.dom.instruction.innerText = `合計「${this.currentDiceSum}」を書き込むマスを選んでください`;
        this.updateBoardUI(); // Update clickable state
    }

    handleCellClick(r, c) {
        if (!this.isWaitingForPlacement) return;
        if (this.board[r][c] !== null) return; // Already filled

        // Place data
        this.board[r][c] = this.currentDiceSum;
        this.isWaitingForPlacement = false;

        // Update UI for this specific cell (for immediate feedback)
        const cell = this.cells[r][c]; // Use stored cell reference
        cell.innerText = this.currentDiceSum;
        cell.classList.remove('clickable');
        cell.classList.add('filled', 'just-filled');

        // Calculate Score
        this.calculateAndShowScore();

        // Check Game Over or Next Turn
        if (this.turnCount >= this.maxTurns) {
            this.handleGameOver();
        } else {
            this.turnCount++;
            this.updateTurnIndicator();
            this.updateTurnIndicator();
            // this.dom.rollBtn.disabled = false;
            // this.dom.instruction.innerText = '「ダイスを振る」を押して次へ';
            this.currentDiceSum = null;
            this.dom.diceSum.innerText = '?';

            // Re-render board cleanly to remove temporary classes if needed
            setTimeout(() => {
                this.updateBoardUI();
                // Auto-roll for next turn
                setTimeout(() => this.rollDice(), 500);
            }, 300);
        }
    }

    calculateAndShowScore() {
        let total = 0;
        const details = [];

        // Rows
        for (let r = 0; r < 5; r++) {
            const row = this.board[r];
            const score = this.calculateLineScore(row);
            this.scoreBoxes.rows[r].innerText = score > 0 ? score : '-';
            if (row.includes(null) === false) {
                this.scoreBoxes.rows[r].style.opacity = '1';
            }
            if (score > 0) {
                total += score;
                details.push(`横${r + 1}列: ${this.getHandName(row)} (+${score})`);
            }
        }

        // Cols
        for (let c = 0; c < 5; c++) {
            const col = [];
            for (let r = 0; r < 5; r++) col.push(this.board[r][c]);
            const score = this.calculateLineScore(col);
            this.scoreBoxes.cols[c].innerText = score > 0 ? score : '-';
            if (score > 0) {
                total += score;
                details.push(`縦${c + 1}列: ${this.getHandName(col)} (+${score})`);
            }
        }

        // Diagonals
        const d1 = [], d2 = [];
        for (let i = 0; i < 5; i++) {
            d1.push(this.board[i][i]); // TL-BR
            d2.push(this.board[i][4 - i]); // TR-BL
        }

        const s1 = this.calculateLineScore(d1);
        const s1Total = s1 * 2;
        this.scoreBoxes.diag1.innerText = s1Total > 0 ? s1Total : '-';
        if (s1 > 0) {
            total += s1Total;
            details.push(`斜め(左上-右下): ${this.getHandName(d1)} (+${s1Total})`);
        }

        const s2 = this.calculateLineScore(d2);
        const s2Total = s2 * 2;
        this.scoreBoxes.diag2.innerText = s2Total > 0 ? s2Total : '-';
        if (s2 > 0) {
            total += s2Total;
            details.push(`斜め(右上-左下): ${this.getHandName(d2)} (+${s2Total})`);
        }

        this.totalScore = total;
        this.dom.totalScore.innerText = total;

        // Update Details List
        this.dom.scoreList.innerHTML = details.map(d => `<li>${d}</li>`).join('');
    }

    calculateLineScore(line) {
        if (line.includes(null)) return 0; // Not full yet

        // Frequency map
        const freq = {};
        line.forEach(n => freq[n] = (freq[n] || 0) + 1);
        const counts = Object.values(freq).sort((a, b) => b - a); // Descending

        // 1. 5 Card
        if (counts[0] === 5) return 10;

        // Check Straight
        const sorted = [...line].sort((a, b) => a - b);
        let isStraight = true;
        for (let i = 0; i < 4; i++) {
            if (sorted[i + 1] - sorted[i] !== 1) {
                isStraight = false;
                break;
            }
        }

        if (isStraight) {
            // 2. Straight (No 7) -> 12pts
            // 3. Straight (With 7) -> 8pts
            if (line.includes(7)) return 8;
            return 12;
        }

        // 4. 4 Card
        if (counts[0] === 4) return 6;

        // 5. Full House (3 + 2)
        if (counts[0] === 3 && counts[1] === 2) return 8;

        // 6. 3 Card
        if (counts[0] === 3) return 3;

        // 7. 2 Pair (2 + 2 + 1)
        if (counts[0] === 2 && counts[1] === 2) return 3;

        // 8. 1 Pair (2 + 1 + 1 + 1)
        if (counts[0] === 2) return 1;

        return 0;
    }

    getHandName(line) {
        if (line.includes(null)) return "";
        const freq = {};
        line.forEach(n => freq[n] = (freq[n] || 0) + 1);
        const counts = Object.values(freq).sort((a, b) => b - a);

        if (counts[0] === 5) return "5カード";

        const sorted = [...line].sort((a, b) => a - b);
        let isStraight = true;
        for (let i = 0; i < 4; i++) {
            if (sorted[i + 1] - sorted[i] !== 1) {
                isStraight = false;
                break;
            }
        }
        if (isStraight) {
            if (line.includes(7)) return "ストレート(7有)";
            return "ストレート(7無)";
        }

        if (counts[0] === 4) return "4カード";
        if (counts[0] === 3 && counts[1] === 2) return "フルハウス";
        if (counts[0] === 3) return "3カード";
        if (counts[0] === 2 && counts[1] === 2) return "2ペア";
        if (counts[0] === 2) return "1ペア";

        return "役なし";
    }

}

// Start Game
window.addEventListener('DOMContentLoaded', () => {
    new DiceBingo();
});
