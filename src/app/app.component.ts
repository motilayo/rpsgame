import { Component } from '@angular/core';
import {Subject} from 'rxjs';
import {debounceTime} from 'rxjs/operators';
import {NgbAlert} from '@ng-bootstrap/ng-bootstrap';


interface Alert {
  type: string;
  message: string;
}

const ALERTS: Alert[] = [{
    type: 'success',
    message: 'YOU WIN!',
  }, {
    type: 'warning',
    message: 'DRAW',
  }, {
    type: 'danger',
    message: 'YOU LOSE!',
  }
];


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  alerts: Alert[];
  title = 'Rock Paper Scissors Game';
  username: string;
  userScore = 0;
  computerScore = 0;
  options = ['rock', 'paper', 'scissors'];
  userChoice: string;
  computerChoice: string;
  outcome: string;

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
        this.outcome = 'DRAW';
        this.clear();
    }
  }

  outputA(){
    this.computerScore ++;
    this.outcome = 'You Lose!';
    this.clear();
  }

  outputB(){
    this.userScore ++;
    this.outcome = 'You win!';
    this.clear();
  }

  clear(){
    setTimeout(() => {
      this.userChoice = '';
      this.computerChoice = '';
      this.outcome = '';
    }, 1500);
  }
}


