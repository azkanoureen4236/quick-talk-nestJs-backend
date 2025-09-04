import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from 'prisma/prisma.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [AuthModule, UserModule, PrismaModule, ChatModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
