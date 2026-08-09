import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';

declare var Peer: any;

export interface GameRound {
  user: string;
  computer: string;
  result: string;
  timestamp?: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'Rock Paper Scissors';
  gameMode: 'vs-computer' | 'online' = 'vs-computer';
  
  username = 'Player 1';
  opponentName = 'Computer';
  userScore = 0;
  computerScore = 0;
  totalGames = 0;
  currentStreak = 0;
  bestStreak = 0;
  
  options = ['rock', 'paper', 'scissors'];
  userChoice = '';
  computerChoice = '';
  outcome = '';
  isBattleActive = false;
  animatingChoice = '';

  // PeerJS WebRTC Multiplayer State
  peer: any = null;
  conn: any = null;
  myPeerId = '';
  targetRoomId = '';
  connectedRoomId = '';
  isConnected = false;
  isHost = false;
  hasUserSelected = false;
  hasPeerSelected = false;
  peerChoice = '';
  copyNotification = false;

  tableColumns: string[] = ['user', 'computer', 'result'];
  tableRow: GameRound[] = [];
  dataSource = new MatTableDataSource<GameRound>(this.tableRow);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit() {
    this.checkUrlRoomHash();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  setGameMode(mode: 'vs-computer' | 'online'): void {
    if (this.gameMode === mode) return;
    this.gameMode = mode;
    this.resetStats();

    if (mode === 'online') {
      this.opponentName = 'Opponent';
      this.initPeer();
    } else {
      this.opponentName = 'Computer';
      this.disconnectPeer();
    }
  }

  // --- WebRTC PeerJS Setup ---
  initPeer(): void {
    if (typeof Peer === 'undefined') {
      console.warn('PeerJS library not loaded');
      return;
    }
  }

  createOnlineRoom(): void {
    if (typeof Peer === 'undefined') return;

    this.disconnectPeer();
    const randomId = 'RPS-' + Math.floor(1000 + Math.random() * 9000);
    
    this.peer = new Peer(randomId);
    this.isHost = true;
    this.myPeerId = randomId;
    this.connectedRoomId = randomId;

    this.peer.on('open', (id: string) => {
      this.myPeerId = id;
      this.updateUrlHash(id);
    });

    this.peer.on('connection', (connection: any) => {
      this.conn = connection;
      this.setupConnectionHandlers();
    });

    this.peer.on('error', (err: any) => {
      console.error('Peer error:', err);
    });
  }

  joinOnlineRoom(roomId?: string): void {
    if (typeof Peer === 'undefined') return;
    const roomToJoin = roomId || this.targetRoomId.trim().toUpperCase();
    if (!roomToJoin) return;

    this.disconnectPeer();
    this.isHost = false;
    this.peer = new Peer();

    this.peer.on('open', () => {
      this.conn = this.peer.connect(roomToJoin);
      this.setupConnectionHandlers();
    });

    this.peer.on('error', (err: any) => {
      console.error('Peer connection error:', err);
      alert('Could not connect to room ' + roomToJoin);
    });
  }

  setupConnectionHandlers(): void {
    if (!this.conn) return;

    this.conn.on('open', () => {
      this.isConnected = true;
      this.connectedRoomId = this.conn.peer || this.myPeerId;
      this.opponentName = 'Player 2';
    });

    this.conn.on('data', (data: any) => {
      this.handlePeerData(data);
    });

    this.conn.on('close', () => {
      this.isConnected = false;
      this.opponentName = 'Opponent (Disconnected)';
    });
  }

  handlePeerData(data: any): void {
    if (data.type === 'CHOICE_READY') {
      this.hasPeerSelected = true;
      if (this.hasUserSelected) {
        this.revealChoices();
      }
    } else if (data.type === 'REVEAL_CHOICE') {
      this.peerChoice = data.choice;
      this.computerChoice = data.choice;
      this.evaluateOnlineRound();
    } else if (data.type === 'RESET') {
      this.resetRoundState();
    }
  }

  disconnectPeer(): void {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.isConnected = false;
    this.myPeerId = '';
    this.connectedRoomId = '';
    window.location.hash = '';
  }

  copyRoomLink(): void {
    const url = window.location.origin + window.location.pathname + '#room=' + this.connectedRoomId;
    navigator.clipboard.writeText(url).then(() => {
      this.copyNotification = true;
      setTimeout(() => this.copyNotification = false, 2500);
    });
  }

  checkUrlRoomHash(): void {
    const hash = window.location.hash;
    if (hash.includes('#room=')) {
      const roomId = hash.replace('#room=', '').trim();
      if (roomId) {
        this.gameMode = 'online';
        this.targetRoomId = roomId;
        this.joinOnlineRoom(roomId);
      }
    }
  }

  updateUrlHash(id: string): void {
    window.location.hash = 'room=' + id;
  }

  // --- Gameplay Logic ---
  setComputerChoice(): void {
    const index = Math.floor(Math.random() * 3);
    this.computerChoice = this.options[index];
  }

  userChoose(choice: string): void {
    if (this.gameMode === 'online') {
      if (!this.isConnected || this.hasUserSelected) return;

      this.userChoice = choice;
      this.animatingChoice = choice;
      this.hasUserSelected = true;

      // Send CHOICE_READY to peer
      this.conn.send({ type: 'CHOICE_READY' });

      if (this.hasPeerSelected) {
        this.revealChoices();
      }
    } else {
      // Single Player Mode
      this.userChoice = choice;
      this.animatingChoice = choice;
      this.isBattleActive = true;
      this.setComputerChoice();
      this.evaluate();

      setTimeout(() => {
        this.animatingChoice = '';
      }, 600);
    }
  }

  revealChoices(): void {
    // Send my choice to peer to reveal
    if (this.conn && this.conn.open) {
      this.conn.send({ type: 'REVEAL_CHOICE', choice: this.userChoice });
    }
  }

  evaluateOnlineRound(): void {
    this.isBattleActive = true;
    this.evaluate();
    setTimeout(() => {
      this.animatingChoice = '';
    }, 600);
  }

  evaluate(): void {
    this.totalGames++;

    if (this.userChoice === this.computerChoice) {
      this.outcome = 'DRAW!';
      this.currentStreak = 0;
    } else {
      switch (this.userChoice + this.computerChoice) {
        case 'rockpaper':
        case 'paperscissors':
        case 'scissorsrock':
          this.outputA(); // Opponent/Computer wins
          break;
        case 'rockscissors':
        case 'paperrock':
        case 'scissorspaper':
          this.outputB(); // User wins
          break;
        default:
          this.outcome = 'DRAW!';
          this.currentStreak = 0;
      }
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.tableRow.unshift({
      user: this.userChoice,
      computer: this.computerChoice,
      result: this.outcome,
      timestamp: timeStr
    });
    
    this.dataSource.data = [...this.tableRow];
  }

  nextRound(): void {
    this.resetRoundState();
    if (this.conn && this.conn.open) {
      this.conn.send({ type: 'RESET' });
    }
  }

  resetRoundState(): void {
    this.userChoice = '';
    this.computerChoice = '';
    this.peerChoice = '';
    this.outcome = '';
    this.hasUserSelected = false;
    this.hasPeerSelected = false;
    this.isBattleActive = false;
  }

  outputA(): void {
    this.computerScore++;
    this.outcome = 'You Lose!';
    this.currentStreak = 0;
  }

  outputB(): void {
    this.userScore++;
    this.outcome = 'You Win!';
    this.currentStreak++;
    if (this.currentStreak > this.bestStreak) {
      this.bestStreak = this.currentStreak;
    }
  }

  get winRate(): number {
    if (this.totalGames === 0) return 0;
    return Math.round((this.userScore / this.totalGames) * 100);
  }

  getChoiceIcon(choice: string): string {
    switch (choice) {
      case 'rock': return '🪨';
      case 'paper': return '📄';
      case 'scissors': return '✂️';
      default: return '❓';
    }
  }

  resetStats(): void {
    this.userScore = 0;
    this.computerScore = 0;
    this.totalGames = 0;
    this.currentStreak = 0;
    this.bestStreak = 0;
    this.resetRoundState();
    this.tableRow = [];
    this.dataSource.data = [];
  }
}


