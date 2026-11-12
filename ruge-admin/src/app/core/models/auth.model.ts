export interface AuthUser {
  id: string;
  username: string;
  nombre: string;
  rol: 'Admin' | 'Coordinador' | 'GlobalAdmin' | 'Logistica' | 'Eventos' | 'Tiempos' | 'Cocina' | 'Calaquero' | 'Guia' | 'Inventario' | 'Registrador';
  churchId?: string | null;
  email?: string | null;
  mustChangePassword?: boolean;
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
  email?: string | null;
  mustChangePassword?: boolean;
}
