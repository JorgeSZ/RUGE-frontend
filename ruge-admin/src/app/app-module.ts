import { APP_INITIALIZER, NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import * as LucideIcons from './core/icons/lucide-icons';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';

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
import { ApprovalComponent } from './features/approval/approval.component';
import { ParticipantDrawerComponent } from './features/participants/participant-drawer/participant-drawer.component';
import { ServerDrawerComponent } from './features/servers/server-drawer/server-drawer.component';
import { CalaqueroComponent } from './features/calaquero/calaquero.component';
import { ConsolidacionComponent } from './features/consolidacion/consolidacion.component';

import { EventContextService } from './core/services/event-context.service';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

@NgModule({
  declarations: [
    App,
    ShellComponent,
    EventsComponent,
    ParticipantsComponent,
    TribesComponent,
    ServersComponent,
    CommissionsComponent,
    ReportsComponent,
    TracksComponent,
    ParticipantRegisterComponent,
    ServerRegisterComponent,
    RegistrationSuccessComponent,
    CheckinComponent,
    CheckinAdminComponent,
    LogisticsComponent,
    LogisticsDetailComponent,
    EvTasksComponent,
    EvTasksDetailComponent,
    DevSeedComponent,
    LoginComponent,
    UnauthorizedComponent,
    UsersComponent,
    ProvisionComponent,
    MenusComponent,
    MenuDetailComponent,
    ApprovalComponent,
    ParticipantDrawerComponent,
    ServerDrawerComponent,
    CalaqueroComponent,
    ConsolidacionComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    AppRoutingModule,
    LucideAngularModule.pick(LucideIcons),
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    {
      provide: APP_INITIALIZER,
      useFactory: (ctx: EventContextService) => () => ctx.initialize(),
      deps: [EventContextService],
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
  bootstrap: [App]
})
export class AppModule { }
