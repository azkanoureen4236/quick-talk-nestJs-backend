import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SignupDto } from 'src/auth/dto/signup.dto';
import { LoginDto } from 'src/auth/dto/login.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(signupDto: SignupDto) {
    try {
      const hashed = await bcrypt.hash(signupDto.password, 10);
      const user = await this.prisma.user.create({
        data: {
          email: signupDto.email,
          name: signupDto.name,
          password: hashed,
        },
      });
      const { password, ...safe } = user;
      return safe; // never return password
    } catch (e) {
      // handle unique email nicely
      if (e?.code === 'P2002') {
        throw new InternalServerErrorException('Email already registered');
      }
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findUserByEmail(email: string) {
    try {
      return await this.prisma.user.findUnique({ where: { email } });
    } catch {
      throw new InternalServerErrorException('Failed to fetch user');
    }
  }

  async validateUserCredentials(loginDto: LoginDto) {
    const user = await this.findUserByEmail(loginDto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(loginDto.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const { password, ...safe } = user;
    return safe;
  }
}
