import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@app/shared';

/** Injects the authenticated user (JWT payload) into a controller method. */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    return data ? user?.[data] : user;
  },
);
