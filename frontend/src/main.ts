import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig).catch((error) => {
  console.error(error);
  const banner = document.getElementById('bootstrap-error');
  if (banner) {
    banner.style.display = 'block';
    banner.textContent =
      error instanceof Error
        ? error.message
        : 'Impossible de démarrer JobBoard. Relancez le frontend (npm start dans frontend/).';
  }
});
