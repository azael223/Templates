import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { environment } from "environments/environment";
import { BehaviorSubject } from "rxjs";
import { skip, tap } from "rxjs/operators";
import * as CryptoJS from "crypto-js";
export interface UserToken {
  user: any;
  access_token: string;
}

@Injectable({
  providedIn: "root",
})
export class UserService {
  private _user$ = new BehaviorSubject<UserToken>(null);
  public user$ = this._user$.asObservable();

  private LS_KEY = "PROJECT_ACCESS_TOKEN";
  private CR_KEY = "PROJECT_CRYPT_TOKEN";

  constructor(private http: HttpClient, private _router: Router) {
    this.init();
  }

  private init() {
    this.initListeners();
    try {
      const userToken = this.getLS();
      this._user$.next(userToken);
    } catch (error) {}
  }

  private initListeners() {
    this.onUserChange();
  }

  private onUserChange() {
    this._user$.pipe(skip(1)).subscribe((userToken) => {
      if (userToken) this.saveLS(userToken);
      else this._router.navigate(["/login"]);
    });
  }

  //Getters
  public get user(): any {
    const userToken = this.getLS();
    return userToken && userToken.user ? userToken.user : null;
  }

  public get accessToken(): string {
    const userToken = this.getLS();
    return userToken && userToken.access_token ? userToken.access_token : "";
  }

  public get userToken(): UserToken | null {
    const userToken = this.getLS();
    return userToken;
  }

  //Methods
  public logIn(userData: { username: string; password: string }) {
    return this.http
      .post<UserToken>(`${environment.apiUrl}/auth/login`, userData)
      .pipe(
        tap((user) => {
          this._user$.next(user);
        })
      );
  }

  public logOut() {
    localStorage.removeItem(this.LS_KEY);
    this._user$.next(null);
  }

  public refresh() {
    return this.http.get<UserToken>(`${environment.apiUrl}/auth/refresh`).pipe(
      tap((user) => {
        this._user$.next(user);
      })
    );
  }

  //Utils
  private getLS() {
    try {
      const encrypted = localStorage.getItem(this.LS_KEY);
      const decrypted = CryptoJS.AES.decrypt(encrypted, this.CR_KEY).toString(
        CryptoJS.enc.Utf8
      );
      return JSON.parse(decrypted);
    } catch (error) {
      return null;
    }
  }

  private saveLS(userToken: UserToken) {
    try {
      const strUserToken = JSON.stringify(userToken);
      const encrypted = CryptoJS.AES.encrypt(
        strUserToken,
        this.CR_KEY
      ).toString();
      localStorage.setItem(this.LS_KEY, encrypted);
    } catch (error) {}
  }
}
