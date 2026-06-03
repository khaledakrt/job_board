import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css',
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly authService = inject(AuthService);

  readonly routes = APP_ROUTES;
  readonly loading = signal(true);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly verifiedEmail = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token')?.trim() || '';

    if (!token) {
      this.loading.set(false);
      this.errorMessage.set('Lien de confirmation manquant ou invalide.');
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: (res) => {
        this.successMessage.set(
          res.message || 'Votre adresse e-mail est confirmée. Vous pouvez vous connecter.'
        );
        if (res.data?.email) {
          this.verifiedEmail.set(res.data.email);
        }
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          err.error?.message || 'Lien invalide ou déjà utilisé.'
        );
        this.loading.set(false);
      },
    });
  }
}
