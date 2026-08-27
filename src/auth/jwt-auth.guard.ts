import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface AuthenticatedUser {
  id: number;
  email: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  private extractToken(request: Request): string | null {
    const fromCookie = request.cookies?.jwt;
    if (fromCookie) {
      return fromCookie;
    }

    const authorization = request.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice(7);
    }

    return null;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token nao fornecido');
    }

    try {
      const payload = this.jwtService.verify<{ sub: number; email: string }>(
        token,
      );
      request['user'] = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Token invalido ou expirado');
    }
  }
}
