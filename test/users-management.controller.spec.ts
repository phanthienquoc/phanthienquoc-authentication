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

      return [{ name, method: Reflect.getMetadata(METHOD_METADATA, handler) }];
    });

  it('applies AdminGuard at the controller boundary', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, controller) as Function[] | undefined;
    expect(guards).toContain(AdminGuard);
  });

  it('keeps the read-only list/detail routes registered', () => {
    const routeNames = registeredRoutes().map(route => route.name);
    expect(routeNames).toEqual(expect.arrayContaining(['list', 'getById']));
  });

  it('registers only the audited role/status/session mutation routes alongside GET routes', () => {
    const routes = registeredRoutes();
    const byName = new Map(routes.map(route => [route.name, route.method]));
    expect(byName.get('list')).toBe(RequestMethod.GET);
    expect(byName.get('getById')).toBe(RequestMethod.GET);
    expect(byName.get('updateRole')).toBe(RequestMethod.PATCH);
    expect(byName.get('updateStatus')).toBe(RequestMethod.PATCH);
    expect(byName.get('revokeSessions')).toBe(RequestMethod.POST);
    expect(routes.every(route => [RequestMethod.GET, RequestMethod.PATCH, RequestMethod.POST].includes(route.method))).toBe(true);
    expect(routes.some(route => route.method === RequestMethod.DELETE)).toBe(false);
  });
});
