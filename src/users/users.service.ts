import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  private async checkIfEmailExists(email: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (user) {
      throw new BadRequestException('E-mail já cadastrado');
    }
  }

  private async checkIfUsernameExists(username: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { username } });
    if (user) {
      throw new BadRequestException('Nome de usuário já cadastrado');
    }
  }

  async createUser(user: User): Promise<User> {
    await this.checkIfEmailExists(user.email);
    await this.checkIfUsernameExists(user.username);

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(user.password, saltRounds);
    user.password = hashedPassword;
    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | undefined> {
    return this.usersRepository.findOne({where: { id } });
  }
}
