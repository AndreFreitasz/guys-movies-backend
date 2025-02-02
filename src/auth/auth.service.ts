import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import {compareSync as bcryptCompareSync} from 'bcrypt';
import { AuthResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService:UsersService,
    private readonly jwtService: JwtService
  ) {}

  async signIn(email: string, password: string): Promise<AuthResponseDto> {
    const foundEmail = await this.usersService.findByEmail(email);

    if (!foundEmail || !bcryptCompareSync(password, foundEmail.password)) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const payload = { email: foundEmail.email, sub: foundEmail.id };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }
}
