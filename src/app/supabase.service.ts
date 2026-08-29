import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private lobbyChannel: RealtimeChannel | null = null;
  private gameChannel: RealtimeChannel | null = null;
  private userId: string;

  // Game state
  private myMove: string | null = null;
  private oppMove: string | null = null;

  private onRoundResolvedCallback: ((myMove: string, oppMove: string, result: string) => void) | null = null;
  private onOpponentLeftCallback: (() => void) | null = null;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    this.userId = 'user-' + Math.random().toString(36).substring(2, 9);
  }

  async findMatch(
    onMatchFound: () => void,
    onRoundResolved: (yourMove: string, oppMove: string, result: string) => void,
    onOpponentLeft: () => void
  ) {
    this.onRoundResolvedCallback = onRoundResolved;
    this.onOpponentLeftCallback = onOpponentLeft;

    // reset game state
    this.myMove = null;
    this.oppMove = null;

    // Join Lobby
    this.lobbyChannel = this.supabase.channel('matchmaking');

    this.lobbyChannel
      .on('presence', { event: 'sync' }, () => {
        const state = this.lobbyChannel!.presenceState();
        const users = Object.keys(state).map(k => state[k][0] as any);
        const others = users.filter(u => u.user_id !== this.userId && u.status === 'searching');

        if (others.length > 0) {
          // Found opponent, host a match
          const opponent = others[0];
          const matchId = `match-${Math.random().toString(36).substring(2, 9)}`;

          this.lobbyChannel!.send({
            type: 'broadcast',
            event: 'invite',
            payload: {
              targetId: opponent.user_id,
              matchId: matchId,
              hostId: this.userId
            }
          });
        }
      })
      .on('broadcast', { event: 'invite' }, (payload: any) => {
        const data = payload.payload;
        if (data.targetId === this.userId) {
          // Send accept to host via the lobby channel, then join match channel
          if (this.lobbyChannel) {
              this.lobbyChannel.send({
                 type: 'broadcast',
                 event: 'accept',
                 payload: { matchId: data.matchId, hostId: data.hostId }
              });
              this.lobbyChannel.untrack();
              this.lobbyChannel.unsubscribe();
              this.lobbyChannel = null;
          }
          this.joinGame(data.matchId, 'p2', onMatchFound);
        }
      })
      .on('broadcast', { event: 'accept' }, (payload: any) => {
         const data = payload.payload;
         if (data.hostId === this.userId) {
           // I am the host and got accepted
           if (this.lobbyChannel) {
              this.lobbyChannel.untrack();
              this.lobbyChannel.unsubscribe();
              this.lobbyChannel = null;
           }
           this.joinGame(data.matchId, 'p1', onMatchFound);
         }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.lobbyChannel!.track({ user_id: this.userId, status: 'searching' });
        }
      });
  }

  private joinGame(matchId: string, role: 'p1' | 'p2', onMatchFound: () => void) {
    if (this.gameChannel) {
        this.gameChannel.unsubscribe();
    }
    this.gameChannel = this.supabase.channel(matchId);

    this.gameChannel
      .on('broadcast', { event: 'move' }, (payload: any) => {
        const data = payload.payload;
        if (data.userId !== this.userId) {
          this.oppMove = data.move;
          this.checkRoundComplete();
        }
      })
      .on('broadcast', { event: 'leave' }, () => {
        if (this.onOpponentLeftCallback) {
          this.onOpponentLeftCallback();
        }
      })
      .subscribe((status) => {
         if (status === 'SUBSCRIBED') {
            onMatchFound();
         }
      });
  }

  sendMove(choice: string) {
    this.myMove = choice;
    if (this.gameChannel) {
      this.gameChannel.send({
        type: 'broadcast',
        event: 'move',
        payload: { userId: this.userId, move: choice }
      });
      this.checkRoundComplete();
    }
  }

  private checkRoundComplete() {
    if (this.myMove && this.oppMove) {
      const myMove = this.myMove;
      const oppMove = this.oppMove;

      let result = 'draw';
      if (
        (myMove === 'rock' && oppMove === 'scissors') ||
        (myMove === 'paper' && oppMove === 'rock') ||
        (myMove === 'scissors' && oppMove === 'paper')
      ) {
        result = 'win';
      } else if (
        (myMove === 'rock' && oppMove === 'paper') ||
        (myMove === 'paper' && oppMove === 'scissors') ||
        (myMove === 'scissors' && oppMove === 'rock')
      ) {
        result = 'lose';
      }

      if (this.onRoundResolvedCallback) {
        this.onRoundResolvedCallback(myMove, oppMove, result);
      }

      this.myMove = null;
      this.oppMove = null;
    }
  }

  leaveMatch() {
    if (this.lobbyChannel) {
      this.lobbyChannel.untrack();
      this.lobbyChannel.unsubscribe();
      this.lobbyChannel = null;
    }
    if (this.gameChannel) {
      this.gameChannel.send({
        type: 'broadcast',
        event: 'leave',
        payload: { userId: this.userId }
      });
      this.gameChannel.unsubscribe();
      this.gameChannel = null;
    }
    this.myMove = null;
    this.oppMove = null;
  }
}
