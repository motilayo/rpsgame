import { AfterViewInit, Component, ViewChild } from '@angular/core';
import {
  MatTableDataSource
} from '@angular/material/table';
import {MatPaginator} from '@angular/material/paginator';



export interface GameRound{
  user: string;
  computer: string;
  result: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit{
  title = 'Rock Paper Scissors Game';
  username: string;
  userScore = 0;
  computerScore = 0;
  options = ['rock', 'paper', 'scissors'];
  userChoice: string;
  computerChoice: string;
  outcome: string;

  tableColumns: string[] = ['user', 'computer', 'result'];
  tableRow: GameRound[] = [];
  dataSource = new MatTableDataSource<GameRound>(this.tableRow);
  @ViewChild(MatPaginator) paginator: MatPaginator;
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  // tslint:disable-next-line: typedef
setComputerChoice(){
    const index = Math.floor(Math.random() * 2);
    this.computerChoice = this.options[index];
  }

  // tslint:disable-next-line: typedef
userChoose(choice: string){
    this.setComputerChoice();
    this.userChoice = choice;
    console.log(this.computerChoice);
    this.evaluate();
  }

evaluate(){
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
    this.clear();
  }

outputA(){
    this.computerScore ++;
    this.outcome = 'You Lose!';
  }

outputB(){
    this.userScore ++;
    this.outcome = 'You Win!';
  }

clear(){
    // setTimeout(() => {
    //   this.userChoice = '';
    //   this.computerChoice = '';
    //   this.outcome = '';
    // }, 1000);
    this.userChoice = '';
    this.computerChoice = '';
    this.outcome = '';
  }
}
