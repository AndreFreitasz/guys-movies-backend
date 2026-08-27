import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CookieOptions, Response } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedUser } from './jwt-auth.guard';

const isProduction = () => process.env.NODE_ENV === 'production';

const buildCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: isProduction() ? 'none' : 'lax',
  path: '/',
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async signIn(@Body() loginDto: LoginDto, @Res() res: Response) {
    const { accessToken } = await this.authService.signIn(
      loginDto.email,
      loginDto.password,
    );

    res.cookie('jwt', accessToken, {
      ...buildCookieOptions(),
      maxAge: 7200000,
    });

    return res.json({ message: 'Login bem-sucedido' });
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() currentUser: AuthenticatedUser) {
    const user = await this.authService.getProfileById(currentUser.id);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async signOut(@Res() res: Response) {
    res.clearCookie('jwt', buildCookieOptions());
    return res.json({ message: 'Logout bem-sucedido' });
  }
}
