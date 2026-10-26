import 'reflect-metadata';

import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { GUARDS_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { validate } from 'class-validator';
import { AdminGuard, type AdminRequest } from '../src/users/admin.guard';
import { UpdateUserRoleDto } from '../src/users/dto/update-user-role.dto';
import { UsersManagementController } from '../src/users/users-management.controller';
import { UsersManagementService } from '../src/users/users-management.service';

describe('UsersManagementController route security contract', () => {
  const controllerType = UsersManagementController;
  const prototype = UsersManagementController.prototype;

  const registeredRoutes = () =>
    Object.getOwnPropertyNames(prototype).flatMap((name) => {
      if (name === 'constructor') return [];
      const handler = Object.getOwnPropertyDescriptor(prototype, name)?.value;
      if (typeof handler !== 'function' || !Reflect.hasMetadata(METHOD_METADATA, handler)) return [];
      return [{ name, method: Reflect.getMetadata(METHOD_METADATA, handler) }];
    });

  it('applies AdminGuard at the controller boundary', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, controllerType) as Function[] | undefined;
    expect(guards).toContain(AdminGuard);
  });

  it('registers only the audited role/status/session mutation routes alongside GET routes', () => {
    const routes = registeredRoutes();
    const byName = new Map(routes.map((route) => [route.name, route.method]));
    expect(byName.get('list')).toBe(RequestMethod.GET);
    expect(byName.get('getById')).toBe(RequestMethod.GET);
    expect(byName.get('updateRole')).toBe(RequestMethod.PATCH);
    expect(byName.get('updateStatus')).toBe(RequestMethod.PATCH);
    expect(byName.get('revokeSessions')).toBe(RequestMethod.POST);
    expect(routes.every((route) =>
      [RequestMethod.GET, RequestMethod.PATCH, RequestMethod.POST].includes(route.method),
    )).toBe(true);
    expect(routes.some((route) => route.method === RequestMethod.DELETE)).toBe(false);
  });

  it('derives actor identity from the verified AdminGuard principal', async () => {
    const service = {
      updateRole: jest.fn().mockResolvedValue({ result: 'updated' }),
    } as unknown as UsersManagementService;
    const controller = new UsersManagementController(service);
    const request = {
      adminPrincipal: { id: '22222222-2222-4222-8222-222222222222', role: 'ADMIN' },
    } as AdminRequest;

    await controller.updateRole(
      '11111111-1111-4111-8111-111111111111',
      { role: 'USER', reasonCode: 'SECURITY_REVIEW' },
      request,
      'request-123',
    );

    expect(service.updateRole).toHaveBeenCalledWith({
      actorUserId: '22222222-2222-4222-8222-222222222222',
      targetUserId: '11111111-1111-4111-8111-111111111111',
      role: 'USER',
      reasonCode: 'SECURITY_REVIEW',
      requestId: 'request-123',
    });
  });

  it('rejects caller-supplied actor identity fields and fails closed without a verified principal', async () => {
    const injected = plainToInstance(UpdateUserRoleDto, {
      role: 'ADMIN',
      reasonCode: 'SECURITY_REVIEW',
      actorUserId: 'attacker-controlled',
    });
    const validationErrors = await validate(injected, { whitelist: true, forbidNonWhitelisted: true });
    expect(validationErrors.map((error) => error.property)).toContain('actorUserId');

    const service = { updateRole: jest.fn() } as unknown as UsersManagementService;
    const controller = new UsersManagementController(service);
    // The controller intentionally throws synchronously before invoking the service
    // when the guard-populated principal is absent.
    expect(() => controller.updateRole(
      '11111111-1111-4111-8111-111111111111',
      { role: 'USER', reasonCode: 'SECURITY_REVIEW' },
      {} as AdminRequest,
      'request-123',
    )).toThrow(ForbiddenException);
    expect(service.updateRole).not.toHaveBeenCalled();
  });
});
