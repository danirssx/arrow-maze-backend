// Pattern: Repository, Adapter
import type { PrismaClient } from '@prisma/client';
import type { UserRepository } from '../../application/identity/ports/UserRepository.js';
import type { AdminUserPage, AdminUserRepository } from '../../application/identity/ports/AdminUserRepository.js';
import { User } from '../../domain/identity/User.js';
import { UserRole } from '../../domain/identity/enums/UserRole.js';
import { UserStatus } from '../../domain/identity/enums/UserStatus.js';
import { Email } from '../../domain/identity/value-objects/Email.js';
import { PasswordHash } from '../../domain/identity/value-objects/PasswordHash.js';
import { Username } from '../../domain/identity/value-objects/Username.js';
import { UserId } from '../../domain/shared/UserId.js';
import { InfrastructureError } from '../../shared/errors/InfrastructureError.js';
import { getClient } from '../database/prismaContext.js';
import { parseEnumFromDb } from '../../shared/parseEnum.js';
import type { Email as EmailType } from '../../domain/identity/value-objects/Email.js';
import type { Username as UsernameType } from '../../domain/identity/value-objects/Username.js';

type UserRecord = {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

function recordToUser(record: UserRecord): User {
  return User.reconstitute(
    UserId.create(record.id),
    Email.create(record.email),
    Username.create(record.username),
    PasswordHash.fromHash(record.passwordHash),
    parseEnumFromDb(UserRole, record.role, 'user role'),
    parseEnumFromDb(UserStatus, record.status, 'user status'),
    record.createdAt,
    record.updatedAt,
  );
}

export class PrismaUserRepository implements UserRepository, AdminUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(offset: number, limit: number): Promise<AdminUserPage> {
    try {
      const [records, total] = await Promise.all([
        getClient(this.prisma).user.findMany({
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'asc' },
        }),
        getClient(this.prisma).user.count(),
      ]);
      return { users: records.map((record) => recordToUser(record)), total };
    } catch (err) {
      throw new InfrastructureError('Failed to list users', { cause: String(err) });
    }
  }

  async save(user: User): Promise<void> {
    try {
      await getClient(this.prisma).user.upsert({
        where: { id: user.id.value },
        create: {
          id: user.id.value,
          email: user.email.value,
          username: user.username.value,
          passwordHash: user.passwordHash.value,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        update: {
          email: user.email.value,
          username: user.username.value,
          passwordHash: user.passwordHash.value,
          role: user.role,
          status: user.status,
          updatedAt: user.updatedAt,
        },
      });
    } catch (err) {
      throw new InfrastructureError('Failed to save user', { cause: String(err) });
    }
  }

  async findById(id: UserId): Promise<User | null> {
    try {
      const record = await getClient(this.prisma).user.findUnique({ where: { id: id.value } });
      return record ? recordToUser(record) : null;
    } catch (err) {
      throw new InfrastructureError('Failed to find user by id', { cause: String(err) });
    }
  }

  async findByEmail(email: EmailType): Promise<User | null> {
    try {
      const record = await getClient(this.prisma).user.findUnique({ where: { email: email.value } });
      return record ? recordToUser(record) : null;
    } catch (err) {
      throw new InfrastructureError('Failed to find user by email', { cause: String(err) });
    }
  }

  async existsByEmail(email: EmailType): Promise<boolean> {
    try {
      const count = await getClient(this.prisma).user.count({ where: { email: email.value } });
      return count > 0;
    } catch (err) {
      throw new InfrastructureError('Failed to check email existence', { cause: String(err) });
    }
  }

  async existsByUsername(username: UsernameType): Promise<boolean> {
    try {
      const count = await getClient(this.prisma).user.count({ where: { username: username.value } });
      return count > 0;
    } catch (err) {
      throw new InfrastructureError('Failed to check username existence', { cause: String(err) });
    }
  }
}
