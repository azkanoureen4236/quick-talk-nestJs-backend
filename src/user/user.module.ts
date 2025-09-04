import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [],
  providers: [UserService, PrismaService],
  exports: [UserService],
})
export class UserModule {}
