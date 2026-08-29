import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { SupabaseService } from './supabase.service';

export interface GameRound{
  user: string;
  computer: string;
  result: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatToolbarModule,
    MatCardModule,
    MatGridListModule,
    MatButtonModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Rock Paper Scissors Game';
  username: string = '';
  userScore = 0;
  computerScore = 0;
  options = ['rock', 'paper', 'scissors'];
  userChoice: string = '';
  computerChoice: string = '';
  outcome: string = '';

  tableColumns: string[] = ['user', 'computer', 'result'];
  tableRow: GameRound[] = [];
  dataSource = new MatTableDataSource<GameRound>(this.tableRow);

  private _paginator!: MatPaginator;
  @ViewChild(MatPaginator) set paginator(p: MatPaginator) {
    if (p) {
      this._paginator = p;
      this.dataSource.paginator = this._paginator;
    }
  }

  // Online Multiplayer State
  mode: 'menu' | 'computer' | 'matchmaking' | 'online' = 'menu';
  onlineScore = { you: 0, opponent: 0 };
  onlineOpponentMove: string = '';

  constructor(private supabase: SupabaseService) {}

  playComputer() {
    this.mode = 'computer';
  }

  async playOnline() {
    this.mode = 'matchmaking';
    await this.supabase.findMatch(
      // On Match found
      () => {
        this.mode = 'online';
        this.onlineScore = { you: 0, opponent: 0 };
        this.resetRound();
      },
      // On Round resolved
      (yourMove, opponentMove, result) => {
        this.userChoice = yourMove;
        this.computerChoice = opponentMove;

        if (result === 'win') {
          this.onlineScore.you++;
          this.outcome = 'You Win!';
        } else if (result === 'lose') {
          this.onlineScore.opponent++;
          this.outcome = 'You Lose!';
        } else {
          this.outcome = 'DRAW!';
        }

        this.tableRow.unshift({
          user: yourMove,
          computer: opponentMove,
          result: this.outcome
        });
        this.dataSource.data = this.tableRow;

        setTimeout(() => this.resetRound(), 2000);
      },
      // On opponent left
      () => {
        alert('Opponent disconnected');
        this.exitToMenu();
      }
    );
  }

  exitToMenu() {
    this.supabase.leaveMatch();
    this.mode = 'menu';
    this.resetRound();
  }

  resetRound() {
    this.userChoice = '';
    this.computerChoice = '';
    this.outcome = '';
    this.onlineOpponentMove = '';
  }

  setComputerChoice() {
    const index = Math.floor(Math.random() * 3);
    this.computerChoice = this.options[index];
  }

  userChoose(choice: string) {
    if (this.mode === 'online') {
      if (this.userChoice) return; // already chose
      this.userChoice = choice;
      this.supabase.sendMove(choice);
    } else {
      this.setComputerChoice();
      this.userChoice = choice;
      this.evaluate();
    }
  }

  evaluate() {
    switch (this.userChoice + this.computerChoice){
      case 'rockpaper':
        this.outputA();
        break;
      case 'rockscissors':
        this.outputB();
        break;
      case 'paperrock':
        this.outputB();
        break;
      case 'paperscissors':
        this.outputA();
        break;
      case 'scissorsrock':
        this.outputA();
        break;
      case 'scissorspaper':
        this.outputB();
        break;
      default:
        this.outcome = 'DRAW!';
    }

    this.tableRow.unshift({
      user: this.userChoice,
      computer: this.computerChoice,
      result: this.outcome
    });
    this.dataSource.data = this.tableRow;
    setTimeout(() => {
      this.userChoice = '';
      this.computerChoice = '';
      this.outcome = '';
    }, 1500);
  }

  outputA(){
    this.computerScore ++;
    this.outcome = 'You Lose!';
  }

  outputB(){
    this.userScore ++;
    this.outcome = 'You Win!';
  }
}
