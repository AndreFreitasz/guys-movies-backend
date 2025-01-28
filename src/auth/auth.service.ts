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

  async signIn(username: string, password: string): Promise<AuthResponseDto> {
    const foundUser = await this.usersService.findByUsername(username);

    if (!foundUser || !bcryptCompareSync(password, foundUser.password)) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = { username: foundUser.username, sub: foundUser.id };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }
}
