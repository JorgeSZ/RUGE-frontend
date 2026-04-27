export interface AuthUser {
  id: string;
  username: string;
  nombre: string;
  rol: 'Admin' | 'Logistica' | 'Eventos' | 'Tiempos';
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface UserDto {
  id: string;
  username: string;
  nombre: string;
  rol: string;
  activo: boolean;
  creadoEn: string;
  ultimoAcceso?: string;
}
