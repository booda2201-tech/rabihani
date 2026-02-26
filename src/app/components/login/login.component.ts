import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  showPassword = false;
  isLoading = false;
  loginError = false;

  constructor(private router: Router) {}

  onLogin(formData: any) {
    this.isLoading = true;
    this.loginError = false;


    setTimeout(() => {
      if (formData.username === 'admin' && formData.password === '123') {
        localStorage.setItem('isLoggedIn', 'true');
        this.router.navigate(['/dashboard/home']);
      } else {
        this.loginError = true;
        this.isLoading = false;
      }
    }, 1500);
  }
}
