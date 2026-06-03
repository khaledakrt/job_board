import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { CandidateProfile, ResumeParseResult } from '../../../core/models/candidate-profile.model';

@Injectable({ providedIn: 'root' })
export class CandidateProfileService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/candidate/profile`;
  private readonly resumeBase = `${environment.apiUrl}/candidate/resume`;

  getProfile(): Observable<ApiResponse<CandidateProfile>> {
    return this.http.get<ApiResponse<CandidateProfile>>(this.base);
  }

  createProfile(payload: Partial<CandidateProfile>): Observable<ApiResponse<CandidateProfile>> {
    return this.http.post<ApiResponse<CandidateProfile>>(this.base, this.toPayload(payload));
  }

  updateProfile(payload: Partial<CandidateProfile>): Observable<ApiResponse<CandidateProfile>> {
    return this.http.put<ApiResponse<CandidateProfile>>(this.base, this.toPayload(payload));
  }

  uploadAvatar(file: File): Observable<ApiResponse<CandidateProfile>> {
    const form = new FormData();
    form.append('avatar', file);
    return this.http.put<ApiResponse<CandidateProfile>>(`${this.base}/avatar`, form);
  }

  parseResume(file: File): Observable<ApiResponse<ResumeParseResult>> {
    const form = new FormData();
    form.append('resume', file);
    return this.http.post<ApiResponse<ResumeParseResult>>(`${this.resumeBase}/parse`, form);
  }

  /** Génère un PDF à partir du profil (visible par les recruteurs). */
  generateResumePdf(): Observable<
    ApiResponse<{ resumeUrl: string; profile: CandidateProfile }>
  > {
    return this.http.post<ApiResponse<{ resumeUrl: string; profile: CandidateProfile }>>(
      `${this.resumeBase}/generate-pdf`,
      {}
    );
  }

  private toPayload(p: Partial<CandidateProfile>) {
    return {
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      professionalTitle: p.professionalTitle,
      bio: p.bio,
      skills: p.skills,
      experiences: p.experiences,
      education: p.education,
      minSalary: p.minSalary,
    };
  }
}
