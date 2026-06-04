import { environment } from '../../../environments/environment';

const API_ORIGIN = environment.apiUrl.replace(/\/api\/?$/, '');

/**
 * Normalise les URLs de fichiers (/uploads/...) pour img[src] et liens.
 * En prod HTTPS, convertit les anciennes URLs http://IP/... en chemin relatif
 * (/uploads/...) pour éviter le blocage « Mixed Content ».
 */
export function resolveUploadUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;

  const uploadsIdx = url.indexOf('/uploads/');
  if (uploadsIdx !== -1) {
    const uploadPath = url.slice(uploadsIdx).split(/[?#]/)[0];
    if (!API_ORIGIN || environment.apiUrl.startsWith('/')) {
      return uploadPath;
    }
    return `${API_ORIGIN}${uploadPath}`;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return API_ORIGIN ? `${API_ORIGIN}${path}` : path;
}
