# Job Board Platform — Workspace File Tree

```
job-board/
├── .gitignore
├── README.md
├── docker-compose.yml
├── docs/
│   ├── FILE_TREE.md
│   ├── API.md
│   └── ARCHITECTURE.md
│
├── backend/
│   ├── package.json
│   ├── package-lock.json
│   ├── .env.example
│   ├── .env.test.example
│   ├── .gitignore
│   ├── .eslintrc.cjs
│   ├── .prettierrc
│   ├── nodemon.json
│   ├── jest.config.js
│   ├── README.md
│   │
│   ├── src/
│   │   ├── server.js
│   │   ├── app.js
│   │   │
│   │   ├── config/
│   │   │   ├── index.js
│   │   │   ├── database.js
│   │   │   ├── env.js
│   │   │   ├── cors.js
│   │   │   ├── rateLimit.js
│   │   │   └── constants.js
│   │   │
│   │   ├── database/
│   │   │   ├── connection.js
│   │   │   ├── sequelize.js
│   │   │   └── migrate.js
│   │   │
│   │   ├── migrations/
│   │   │   └── 001_initial_schema.sql
│   │   │
│   │   ├── seeders/
│   │   │   ├── 001_admin_user.seeder.js
│   │   │   ├── 002_sample_companies.seeder.js
│   │   │   └── index.js
│   │   │
│   │   ├── models/
│   │   │   ├── index.js
│   │   │   ├── User.js
│   │   │   ├── Company.js
│   │   │   ├── RecruiterProfile.js
│   │   │   ├── CandidateProfile.js
│   │   │   ├── Job.js
│   │   │   ├── SavedJob.js
│   │   │   ├── JobAlert.js
│   │   │   ├── Application.js
│   │   │   ├── ApplicationNote.js
│   │   │   ├── CandidateNotification.js
│   │   │   └── Subscription.js
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── user.controller.js
│   │   │   ├── company.controller.js
│   │   │   ├── recruiterProfile.controller.js
│   │   │   ├── candidateProfile.controller.js
│   │   │   ├── job.controller.js
│   │   │   ├── savedJob.controller.js
│   │   │   ├── jobAlert.controller.js
│   │   │   ├── application.controller.js
│   │   │   ├── applicationNote.controller.js
│   │   │   ├── notification.controller.js
│   │   │   └── subscription.controller.js
│   │   │
│   │   ├── routes/
│   │   │   ├── index.js
│   │   │   ├── auth.routes.js
│   │   │   ├── users.routes.js
│   │   │   ├── companies.routes.js
│   │   │   ├── recruiters.routes.js
│   │   │   ├── candidates.routes.js
│   │   │   ├── jobs.routes.js
│   │   │   ├── savedJobs.routes.js
│   │   │   ├── jobAlerts.routes.js
│   │   │   ├── applications.routes.js
│   │   │   ├── applicationNotes.routes.js
│   │   │   ├── notifications.routes.js
│   │   │   └── subscriptions.routes.js
│   │   │
│   │   ├── middleware/
│   │   │   ├── authenticate.js
│   │   │   ├── authorize.js
│   │   │   ├── validate.js
│   │   │   ├── errorHandler.js
│   │   │   ├── notFound.js
│   │   │   ├── requestLogger.js
│   │   │   └── upload.js
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.js
│   │   │   ├── email.service.js
│   │   │   ├── token.service.js
│   │   │   ├── user.service.js
│   │   │   ├── company.service.js
│   │   │   ├── recruiterProfile.service.js
│   │   │   ├── candidateProfile.service.js
│   │   │   ├── job.service.js
│   │   │   ├── jobSearch.service.js
│   │   │   ├── savedJob.service.js
│   │   │   ├── jobAlert.service.js
│   │   │   ├── application.service.js
│   │   │   ├── applicationNote.service.js
│   │   │   ├── notification.service.js
│   │   │   └── subscription.service.js
│   │   │
│   │   ├── validators/
│   │   │   ├── auth.validator.js
│   │   │   ├── user.validator.js
│   │   │   ├── company.validator.js
│   │   │   ├── recruiterProfile.validator.js
│   │   │   ├── candidateProfile.validator.js
│   │   │   ├── job.validator.js
│   │   │   ├── jobAlert.validator.js
│   │   │   ├── application.validator.js
│   │   │   ├── applicationNote.validator.js
│   │   │   └── subscription.validator.js
│   │   │
│   │   ├── utils/
│   │   │   ├── ApiError.js
│   │   │   ├── ApiResponse.js
│   │   │   ├── asyncHandler.js
│   │   │   ├── password.js
│   │   │   ├── uuid.js
│   │   │   ├── pagination.js
│   │   │   └── logger.js
│   │   │
│   │   └── jobs/
│   │       ├── index.js
│   │       ├── jobAlertMatcher.job.js
│   │       └── subscriptionRenewal.job.js
│   │
│   └── tests/
│       ├── setup.js
│       ├── teardown.js
│       ├── helpers/
│       │   ├── db.helper.js
│       │   └── auth.helper.js
│       ├── unit/
│       │   ├── services/
│       │   │   ├── auth.service.test.js
│       │   │   └── jobSearch.service.test.js
│       │   └── utils/
│       │       └── password.test.js
│       └── integration/
│           ├── auth.routes.test.js
│           ├── jobs.routes.test.js
│           └── applications.routes.test.js
│
└── frontend/
    ├── package.json
    ├── package-lock.json
    ├── angular.json
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── tsconfig.spec.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .editorconfig
    ├── .gitignore
    ├── .eslintrc.json
    ├── .prettierrc
    ├── README.md
    │
    ├── public/
    │   ├── favicon.ico
    │   └── assets/
    │       ├── images/
    │       │   ├── logo.svg
    │       │   └── placeholders/
    │       │       ├── avatar.svg
    │       │       └── company.svg
    │       └── icons/
    │
    └── src/
        ├── index.html
        ├── main.ts
        ├── styles.css
        ├── environments/
        │   ├── environment.ts
        │   └── environment.prod.ts
        │
        └── app/
            ├── app.config.ts
            ├── app.routes.ts
            ├── app.component.ts
            ├── app.component.html
            │
            ├── core/
            │   ├── guards/
            │   │   ├── auth.guard.ts
            │   │   ├── role.guard.ts
            │   │   └── guest.guard.ts
            │   ├── interceptors/
            │   │   ├── auth.interceptor.ts
            │   │   ├── error.interceptor.ts
            │   │   └── loading.interceptor.ts
            │   ├── services/
            │   │   ├── api.service.ts
            │   │   ├── auth.service.ts
            │   │   ├── token-storage.service.ts
            │   │   ├── user.service.ts
            │   │   ├── company.service.ts
            │   │   ├── job.service.ts
            │   │   ├── application.service.ts
            │   │   ├── notification.service.ts
            │   │   └── subscription.service.ts
            │   ├── models/
            │   │   ├── user.model.ts
            │   │   ├── company.model.ts
            │   │   ├── recruiter-profile.model.ts
            │   │   ├── candidate-profile.model.ts
            │   │   ├── job.model.ts
            │   │   ├── application.model.ts
            │   │   ├── notification.model.ts
            │   │   ├── pagination.model.ts
            │   │   └── api-response.model.ts
            │   ├── constants/
            │   │   ├── roles.constant.ts
            │   │   ├── job-status.constant.ts
            │   │   ├── application-status.constant.ts
            │   │   └── routes.constant.ts
            │   └── utils/
            │       ├── date.util.ts
            │       └── salary.util.ts
            │
            ├── shared/
            │   ├── components/
            │   │   ├── ui/
            │   │   │   ├── button/
            │   │   │   │   └── button.component.ts
            │   │   │   ├── input/
            │   │   │   │   └── input.component.ts
            │   │   │   ├── select/
            │   │   │   │   └── select.component.ts
            │   │   │   ├── badge/
            │   │   │   │   └── badge.component.ts
            │   │   │   ├── card/
            │   │   │   │   └── card.component.ts
            │   │   │   ├── modal/
            │   │   │   │   └── modal.component.ts
            │   │   │   ├── spinner/
            │   │   │   │   └── spinner.component.ts
            │   │   │   ├── pagination/
            │   │   │   │   └── pagination.component.ts
            │   │   │   ├── empty-state/
            │   │   │   │   └── empty-state.component.ts
            │   │   │   └── toast/
            │   │   │       └── toast.component.ts
            │   │   ├── layout/
            │   │   │   ├── header/
            │   │   │   │   └── header.component.ts
            │   │   │   ├── footer/
            │   │   │   │   └── footer.component.ts
            │   │   │   ├── sidebar/
            │   │   │   │   └── sidebar.component.ts
            │   │   │   └── main-layout/
            │   │   │       └── main-layout.component.ts
            │   │   ├── job-card/
            │   │   │   └── job-card.component.ts
            │   │   ├── company-card/
            │   │   │   └── company-card.component.ts
            │   │   ├── application-status-badge/
            │   │   │   └── application-status-badge.component.ts
            │   │   └── search-filters/
            │   │       └── search-filters.component.ts
            │   ├── directives/
            │   │   ├── click-outside.directive.ts
            │   │   └── autofocus.directive.ts
            │   ├── pipes/
            │   │   ├── truncate.pipe.ts
            │   │   ├── salary-range.pipe.ts
            │   │   └── time-ago.pipe.ts
            │   └── validators/
            │       └── custom-validators.ts
            │
            └── features/
                ├── auth/
                │   ├── auth.routes.ts
                │   ├── login/
                │   │   └── login.component.ts
                │   ├── register/
                │   │   └── register.component.ts
                │   ├── verify-email/
                │   │   └── verify-email.component.ts
                │   ├── forgot-password/
                │   │   └── forgot-password.component.ts
                │   └── reset-password/
                │       └── reset-password.component.ts
                │
                ├── public/
                │   ├── public.routes.ts
                │   ├── home/
                │   │   └── home.component.ts
                │   ├── job-list/
                │   │   └── job-list.component.ts
                │   ├── job-detail/
                │   │   └── job-detail.component.ts
                │   └── company-profile/
                │       └── company-profile.component.ts
                │
                ├── candidate/
                │   ├── candidate.routes.ts
                │   ├── dashboard/
                │   │   └── candidate-dashboard.component.ts
                │   ├── profile/
                │   │   └── candidate-profile.component.ts
                │   ├── saved-jobs/
                │   │   └── saved-jobs.component.ts
                │   ├── job-alerts/
                │   │   └── job-alerts.component.ts
                │   ├── applications/
                │   │   ├── my-applications.component.ts
                │   │   └── application-detail.component.ts
                │   └── notifications/
                │       └── notifications.component.ts
                │
                ├── recruiter/
                │   ├── recruiter.routes.ts
                │   ├── dashboard/
                │   │   └── recruiter-dashboard.component.ts
                │   ├── company-settings/
                │   │   └── company-settings.component.ts
                │   ├── team/
                │   │   └── team-management.component.ts
                │   ├── jobs/
                │   │   ├── job-list-manage.component.ts
                │   │   ├── job-form/
                │   │   │   └── job-form.component.ts
                │   │   └── job-analytics/
                │   │       └── job-analytics.component.ts
                │   └── applications/
                │       ├── pipeline/
                │       │   └── application-pipeline.component.ts
                │       └── application-review/
                │           └── application-review.component.ts
                │
                └── admin/
                    ├── admin.routes.ts
                    ├── dashboard/
                    │   └── admin-dashboard.component.ts
                    ├── users/
                    │   └── user-management.component.ts
                    ├── companies/
                    │   └── company-management.component.ts
                    └── subscriptions/
                        └── subscription-management.component.ts
```

## Layer Responsibilities

| Layer | Backend | Frontend |
|-------|---------|----------|
| Entry | `server.js`, `app.js` | `main.ts`, `app.config.ts` |
| Routing | `routes/*.routes.js` | `app.routes.ts`, feature `*.routes.ts` |
| Business logic | `services/*.service.js` | Feature components + core services |
| Data access | Sequelize `models/` | HTTP via `api.service.ts` |
| Validation | `validators/` + `middleware/validate.js` | Reactive forms + `validators/` |
| Security | `middleware/authenticate.js`, `authorize.js` | Guards + interceptors |
| Cross-cutting | `utils/`, `jobs/` | `shared/`, pipes, directives |
