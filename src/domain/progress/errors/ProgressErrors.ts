export class ProgressUserMismatchError extends Error {
  constructor(localUserId: string, remoteUserId: string) {
    super(`Cannot merge progress for different users: ${localUserId} vs ${remoteUserId}`);
    this.name = 'ProgressUserMismatchError';
  }
}
