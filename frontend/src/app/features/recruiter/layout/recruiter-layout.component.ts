import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { RecruiterContextService } from '../services/recruiter-context.service';
import { RecruiterNotificationBellComponent } from '../shared/notification-bell/notification-bell.component';

@Component({
  selector: 'app-recruiter-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, RecruiterNotificationBellComponent],
  templateUrl: './recruiter-layout.component.html',
  styleUrl: './recruiter-layout.component.css',
})
export class RecruiterLayoutComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly context = inject(RecruiterContextService);
  readonly routes = APP_ROUTES;

  ngOnInit(): void {
    this.context.loadContext().subscribe();
  }

  logout(): void {
    this.authService.logout();
  }
}
