import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  async create(
    @Body() createUserDto: CreateUserDto,
  ): Promise<{ message: string }> {
    await this.usersService.createUser(createUserDto);
    return { message: 'Usuário cadastrado com sucesso!' };
  }
}
