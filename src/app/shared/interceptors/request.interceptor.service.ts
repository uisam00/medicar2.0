import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpHandler, HttpEvent, HttpRequest, HttpErrorResponse } from "@angular/common/http";
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, finalize, switchMap, take } from 'rxjs/operators';

import { Notifications } from 'src/app/shared/models/notifications';
import { StringHelper } from 'src/app/shared/helpers/string-helper';
import { Pages } from 'src/app/shared/models/pages';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/core/services/auth.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { User } from '../models/user';

@Injectable()
export class RequestInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(
    null
  );

  constructor(private router: Router, private toastr: ToastrService, private authService: AuthService, private spinner: NgxSpinnerService) { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    let currentUser = this.authService.getCurrentUser();

    if (currentUser) {
      request = this.addToken(request, currentUser.accessToken);
    }


    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          const msgError = error.error?.errors?.join(", ")
          if(msgError){
            this.toastr.warning(msgError);
            this.router.navigate([Pages.Authentication.login]).then(_ => console.log('redirect to login'));
            return throwError(error);
          }
          else
            return this.handle401Error(request, next);
        } else {
          this.toastr.warning(Notifications.genericError);
          this.router.navigate([Pages.Authentication.login]).then(_ => console.log('redirect to login'));
          return throwError(error);
        }
      }),
  );
  }

  // private ifIsLoggedNotification() {
  //   this.authService.getCurrentUser().subscribe(user => {
  //     if (StringHelper.isNullOrEmpty(user?.accessToken)) {
  //       this.toastr.warning(Notifications.invalidCredentials);
  //     } else {
  //       this.toastr.warning(Notifications.disconnect);
  //       this.router.navigate([Pages.Authentication.login]);
  //     }
  //   })
  // }

  private addToken(request: HttpRequest<any>, token: string) {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler) {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((user: any) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(user['accessToken']);
          return next.handle(this.addToken(request, user['accessToken']));
        })
      );
    } else {
      return this.refreshTokenSubject.pipe(
        filter((token) => token != null),
        take(1),
        switchMap((jwt) => {
          return next.handle(this.addToken(request, jwt));
        })
      );
    }
  }
}
