export interface UnitOfWork {
  runInTransaction<Result>(operation: () => Promise<Result>): Promise<Result>;
}

