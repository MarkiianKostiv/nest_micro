import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { UsersService } from '../users/users.service';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { TokenPayload } from '../interfaces/token-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) =>
          request.cookies.Authentication || request?.Authentication,
      ]),
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }
  async validate({ userId }: TokenPayload) {
    try {
      return await this.usersService.findOne(userId);
    } catch (error) {
      throw new UnauthorizedException(error);
    }
  }
}
