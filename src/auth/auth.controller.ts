import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthResponseDto } from './dto/auth.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async signIn(@Body() loginDto: LoginDto, @Res() res: Response) {
    const { accessToken } = await this.authService.signIn(
      loginDto.email,
      loginDto.password,
    );
    res.cookie('jwt', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7200000,
    });

    return res.json({ message: 'Login bem-sucedido' });
  }

  @Get('profile')
  async getProfile(@Req() req: Request, @Res() res: Response) {

    const token = req.cookies?.jwt;
    if (!token) {
      throw new UnauthorizedException('Token não fornecido');
    }

    const user = await this.authService.getProfile(token);
    console.log(user);
    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    });
  }

  @Post('logout')
  async signOut(@Res() res: Response) {
    res.clearCookie('jwt');
    return res.json({ message: 'Logout bem-sucedido' });
  }
}
