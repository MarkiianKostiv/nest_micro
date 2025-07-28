import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto) {
    await this.createValidateUserDto(createUserDto);
    return this.usersRepository.create({
      ...createUserDto,
      password: await bcrypt.hash(createUserDto.password, 10),
    });
  }

  private async createValidateUserDto(createUserDto: CreateUserDto) {
    try {
      await this.usersRepository.findOne({ email: createUserDto.email });
    } catch (error) {
      return;
    }

    throw new UnprocessableEntityException('Email already exists');
  }
  async findAll() {
    return this.usersRepository.find({});
  }

  async findOne(id: string) {
    return this.usersRepository.findOne({ _id: id });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.usersRepository.findOneAndUpdate(
      { _id: id },
      { $set: updateUserDto },
    );
  }

  async remove(id: string) {
    return this.usersRepository.findOneAndDelete({ _id: id });
  }

  async verifyUser(email: string, password: string) {
    const user = await this.usersRepository.findOneWithPassword({ email });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
