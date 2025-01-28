import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() user: User): Promise<{ message: string }> {
    await this.usersService.createUser(user);
    return { message: 'Usuário cadastrado com sucesso!' };
  }
}
