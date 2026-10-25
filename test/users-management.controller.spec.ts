import 'reflect-metadata';

import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { AdminGuard } from '../src/users/admin.guard';
import { UsersManagementController } from '../src/users/users-management.controller';

describe('UsersManagementController route security contract', () => {
  const controller = UsersManagementController;
  const prototype = UsersManagementController.prototype;

  const registeredRoutes = () =>
    Object.getOwnPropertyNames(prototype).flatMap(name => {
      if (name === 'constructor') return [];

      const handler = Object.getOwnPropertyDescriptor(prototype, name)?.value;
      if (typeof handler !== 'function' || !Reflect.hasMetadata(METHOD_METADATA, handler)) {
        return [];
      }

      return [
        {
          name,
          method: Reflect.getMetadata(METHOD_METADATA, handler),
        },
      ];
    });

  it('applies AdminGuard at the controller boundary', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, controller) as Function[] | undefined;

    expect(guards).toContain(AdminGuard);
  });

  it('keeps the list and detail routes registered', () => {
    const routeNames = registeredRoutes().map(route => route.name);

    expect(routeNames).toEqual(expect.arrayContaining(['list', 'getById']));
  });

  it('keeps every registered route GET-only until audit-backed mutations are implemented', () => {
    const routes = registeredRoutes();

    expect(routes.length).toBeGreaterThan(0);
    expect(routes.every(route => route.method === RequestMethod.GET)).toBe(true);
  });
});
