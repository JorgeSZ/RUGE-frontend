import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { EventsComponent } from './features/events/events.component';
import { ParticipantsComponent } from './features/participants/participants.component';
import { TribesComponent } from './features/tribes/tribes.component';
import { ServersComponent } from './features/servers/servers.component';
import { CommissionsComponent } from './features/commissions/commissions.component';
import { ReportsComponent } from './features/reports/reports.component';
import { TracksComponent } from './features/tracks/tracks.component';
import { ParticipantRegisterComponent } from './features/public-registration/participant-register/participant-register.component';
import { ServerRegisterComponent } from './features/public-registration/server-register/server-register.component';
import { RegistrationSuccessComponent } from './features/public-registration/registration-success/registration-success.component';
import { CheckinComponent } from './features/checkin/checkin.component';
import { CheckinAdminComponent } from './features/checkin/checkin-admin.component';
import { LogisticsComponent } from './features/logistics/logistics.component';
import { LogisticsDetailComponent } from './features/logistics/logistics-detail.component';
import { EvTasksComponent } from './features/ev-tasks/ev-tasks.component';
import { EvTasksDetailComponent } from './features/ev-tasks/ev-tasks-detail.component';
import { DevSeedComponent } from './features/dev/dev-seed.component';
import { LoginComponent } from './features/auth/login.component';
import { UnauthorizedComponent } from './features/auth/unauthorized.component';
import { UsersComponent } from './features/users/users.component';
import { ProvisionComponent } from './features/provision/provision.component';
import { MenusComponent } from './features/menus/menus.component';
import { MenuDetailComponent } from './features/menus/menu-detail.component';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { EventGuard } from './core/guards/event.guard';

const ADMIN              = { roles: ['Admin'] };
const ADMIN_LOGISTICA    = { roles: ['Admin', 'Logistica'] };
const ADMIN_EVENTOS      = { roles: ['Admin', 'Eventos'] };
const ADMIN_TIEMPOS      = { roles: ['Admin', 'Tiempos'] };
const ADMIN_COCINA       = { roles: ['Admin', 'Cocina'] };

const routes: Routes = [
  // ── Public (no auth, no shell) ──────────────────────────────────────────
  { path: 'login',                       component: LoginComponent },
  { path: 'unauthorized',               component: UnauthorizedComponent },
  { path: 'registro/senderista/:eventId', component: ParticipantRegisterComponent },
  { path: 'registro/servidor/:eventId',   component: ServerRegisterComponent },
  { path: 'registro/confirmacion',        component: RegistrationSuccessComponent },
  { path: 'checkin/:eventId',             component: CheckinComponent },

  // ── Protected admin shell ────────────────────────────────────────────────
  {
    path: '',
    component: ShellComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'events', pathMatch: 'full' },

      // Admin only
      { path: 'events',       component: EventsComponent,      canActivate: [RoleGuard], data: ADMIN },
      { path: 'tracks',       component: TracksComponent,      canActivate: [RoleGuard], data: ADMIN_TIEMPOS },
      { path: 'users',        component: UsersComponent,       canActivate: [RoleGuard], data: ADMIN },
      { path: 'participants', component: ParticipantsComponent, canActivate: [RoleGuard, EventGuard], data: ADMIN },
      { path: 'tribes',       component: TribesComponent,      canActivate: [RoleGuard, EventGuard], data: ADMIN },
      { path: 'servers',      component: ServersComponent,     canActivate: [RoleGuard, EventGuard], data: ADMIN },
      { path: 'commissions',  component: CommissionsComponent, canActivate: [RoleGuard, EventGuard], data: ADMIN },
      { path: 'checkin-admin',component: CheckinAdminComponent,canActivate: [RoleGuard, EventGuard], data: ADMIN },
      { path: 'reports',      component: ReportsComponent,     canActivate: [RoleGuard, EventGuard], data: ADMIN_COCINA },

      // Admin + Logistica
      { path: 'logistics',                       component: LogisticsComponent,      canActivate: [RoleGuard, EventGuard], data: ADMIN_LOGISTICA },
      { path: 'logistics/segment/:segmentId',    component: LogisticsDetailComponent, canActivate: [RoleGuard, EventGuard], data: ADMIN_LOGISTICA },

      // Admin + Eventos
      { path: 'ev-tasks',                        component: EvTasksComponent,        canActivate: [RoleGuard, EventGuard], data: ADMIN_EVENTOS },
      { path: 'ev-tasks/segment/:segmentId',     component: EvTasksDetailComponent,  canActivate: [RoleGuard, EventGuard], data: ADMIN_EVENTOS },

      // Global modules (Admin + Cocina)
      { path: 'provision',     component: ProvisionComponent,  canActivate: [RoleGuard], data: ADMIN_COCINA },
      { path: 'menus',         component: MenusComponent,      canActivate: [RoleGuard], data: ADMIN_COCINA },
      { path: 'menus/:menuId', component: MenuDetailComponent, canActivate: [RoleGuard], data: ADMIN_COCINA },

      // Dev (no role restriction, dev environment only)
      { path: 'dev', component: DevSeedComponent },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
