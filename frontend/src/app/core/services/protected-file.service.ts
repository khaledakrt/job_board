import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { resolveAuthenticatedUploadUrl } from '../utils/asset-url.util';

@Injectable({ providedIn: 'root' })
export class ProtectedFileService {
  private readonly http = inject(HttpClient);

  resolveUrl(url: string | null | undefined): string | null {
    return resolveAuthenticatedUploadUrl(url);
  }

  fetchBlob(url: string | null | undefined): Observable<Blob> {
    const resolved = this.resolveUrl(url);
    if (!resolved) {
      throw new Error('Protected file URL is missing');
    }

    return this.http.get(resolved, {
      responseType: 'blob',
      withCredentials: true,
    });
  }

  openFile(url: string | null | undefined, onError?: () => void): void {
    const target = window.open('about:blank', '_blank');
    if (target) {
      target.opener = null;
      target.document.write(
        '<!doctype html><html><head><title>Chargement du PDF</title></head><body style="font-family:system-ui,sans-serif;padding:24px;color:#0f172a">Chargement du PDF...</body></html>'
      );
      target.document.close();
    }

    this.fetchBlob(url).subscribe({
      next: (blob) => {
        const objectUrl = this.createObjectUrl(blob);
        if (target) {
          target.document.open();
          target.document.write(`<!doctype html>
            <html>
              <head>
                <title>CV PDF</title>
                <style>
                  html, body, iframe { width: 100%; height: 100%; margin: 0; border: 0; }
                  body { background: #0f172a; }
                </style>
              </head>
              <body>
                <iframe src="${objectUrl}" title="CV PDF"></iframe>
              </body>
            </html>`);
          target.document.close();
        } else {
          const link = document.createElement('a');
          link.href = objectUrl;
          link.target = '_blank';
          link.rel = 'noopener';
          link.click();
        }
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      },
      error: () => {
        if (target) {
          target.document.body.innerHTML =
            '<p style="font-family:system-ui,sans-serif;padding:24px;color:#b91c1c">Impossible d’ouvrir ce PDF. Revenez à l’application et réessayez.</p>';
        }
        onError?.();
      },
    });
  }

  openBlob(blob: Blob): void {
    const objectUrl = this.createObjectUrl(blob);
    window.open(objectUrl, '_blank', 'noopener');
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }

  private createObjectUrl(blob: Blob): string {
    const typed =
      blob.type && blob.type !== 'application/octet-stream'
        ? blob
        : new Blob([blob], { type: 'application/pdf' });
    return URL.createObjectURL(typed);
  }
}
