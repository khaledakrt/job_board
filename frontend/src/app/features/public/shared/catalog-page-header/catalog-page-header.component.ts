import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_ROUTES } from '../../../../core/constants/routes.constant';

export type CatalogPageTheme = 'training' | 'institution';

@Component({
  selector: 'app-catalog-page-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './catalog-page-header.component.html',
  styleUrl: '../public-catalog.page.css',
})
export class CatalogPageHeaderComponent {
  readonly routes = APP_ROUTES;

  readonly theme = input<CatalogPageTheme>('training');
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly breadcrumbLabel = input.required<string>();
  readonly listRoute = input.required<string>();
  readonly registerRoute = input.required<string>();
  readonly registerLabel = input.required<string>();
  readonly loginHint = input<string>('Déjà inscrit ? Connexion');
  readonly showActions = input(true);
}
