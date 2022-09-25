import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, of, ReplaySubject, take, tap } from 'rxjs';
import { BaseService } from 'src/app/core/services/base.service';
import { ConfigService } from 'src/app/core/services/config.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { LocalStorage, ROUTES_USER_API } from 'src/app/shared/models/constants';
import { Pages } from 'src/app/shared/models/pages';
import { UserCredentials } from 'src/app/shared/models/user-credentials';

import { User } from '../../shared/models/user';

@Injectable({
  providedIn: 'root'
})
export class AuthService extends BaseService {
  getCurrentUser(): User {
    let userJson = localStorage.getItem(LocalStorage.user)
    return userJson ? JSON.parse(userJson) : new User
  }

  isUserLogged(): boolean {
    return localStorage.getItem(LocalStorage.user) !== null
  }

  constructor(
    protected notification: NotificationService,
    private router: Router,
    protected http: HttpClient,
    protected config: ConfigService) {
    super(notification, http, config)
    this.getCurrentUser();
  }

  public setCurrentUser(user: User): void {
    localStorage.setItem(LocalStorage.user, JSON.stringify(user));
  }

  login(credentials: UserCredentials): Observable<void> {
    return this.http.post<User>(this.urlAuthApi + ROUTES_USER_API.login, credentials).pipe(
      take(1),
      map((response: User) => {
        const user = response;
        if (user) {
          this.setCurrentUser(user)
        }
      })
    );
  }
  refreshToken() {
    const user = this.getCurrentUser();
    return this.http
      .post<any>(this.urlAuthApi + ROUTES_USER_API.refreshToken, {
        refreshToken: user?.refreshToken,
      })
      .pipe(
        tap((user) => {
          this.setCurrentUser(user);
        }),
        catchError((error) => {
          this.logout();
          return of(false);
        })
      );

  }


  logout(): void {
    localStorage.removeItem('user');
    this.router.navigate([Pages.Authentication.login]);

  }
}
