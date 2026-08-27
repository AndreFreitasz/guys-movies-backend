import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { compare as bcryptCompare } from 'bcrypt';
import { AuthResponseDto } from './dto/auth.dto';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signIn(email: string, password: string): Promise<AuthResponseDto> {
    const foundUser = await this.usersService.findByEmail(email);
    const passwordMatches =
      foundUser && (await bcryptCompare(password, foundUser.password));

    if (!passwordMatches) {
      throw new UnauthorizedException('E-mail ou senha invalidos');
    }

    const payload = { email: foundUser.email, sub: foundUser.id };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }

  async getProfileById(userId: number): Promise<User> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado');
    }
    return user;
  }
}
