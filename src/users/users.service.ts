import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  private async ensureCredentialsAreAvailable(
    email: string,
    username: string,
  ): Promise<void> {
    const existing = await this.usersRepository.findOne({
      where: [{ email }, { username }],
      select: ['id'],
    });

    if (existing) {
      throw new BadRequestException('E-mail ou nome de usuário já cadastrado');
    }
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    await this.ensureCredentialsAreAvailable(
      createUserDto.email,
      createUserDto.username,
    );

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      SALT_ROUNDS,
    );

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'username', 'name', 'password'],
    });
  }

  async findById(id: number): Promise<User | undefined> {
    return this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'username', 'name'],
    });
  }
}
