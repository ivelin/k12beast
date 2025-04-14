// tests/server/migrationUtils.spec.ts
import { ensureTablesExist } from '../../scripts/migrationUtils';

// Mock Supabase
jest.mock('../../src/supabase/serverClient', () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  limit: jest.fn(),
  eq: jest.fn(),
}));

describe('migrationUtils - ensureTablesExist', () => {
  let supabase: any;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    supabase = jest.requireMock('../../src/supabase/serverClient');
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.clearAllMocks();

    // Default mock for successful table creation
    supabase.functions = {
      invoke: jest.fn().mockResolvedValue({ data: { success: true }, error: null }),
    };
    // Default mock for table verification (empty result)
    supabase.limit.mockResolvedValue({ data: [], error: { code: 'PGRST116' } });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should verify all tables and log success when sessions table exists', async () => {
    await expect(ensureTablesExist(supabase)).resolves.toBeUndefined();
    expect(consoleLogSpy).toHaveBeenCalledWith('All required tables ensured and verified.');
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Sessions table status before migrations'));
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('sessions');
    expect(supabase.from).toHaveBeenCalledWith('migrations');
    expect(supabase.from).toHaveBeenCalledWith('db_app_version_compatibility');
    expect(supabase.from).toHaveBeenCalledWith('migration_locks');
  });

  it('should throw error and log failure when sessions table verification fails', async () => {
    // Mock migrations, compatibility, and locks verification as empty (PGRST116)
    supabase.limit
      .mockResolvedValueOnce({ data: [], error: { code: 'PGRST116' } }) // migrations
      .mockResolvedValueOnce({ data: [], error: { code: 'PGRST116' } }) // db_app_version_compatibility
      .mockResolvedValueOnce({ data: [], error: { code: 'PGRST116' } }) // migration_locks
      // Mock sessions table verification failure with unexpected error
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST999', message: 'Database error' } })
      // Mock final sessions verification (not reached due to error)
      .mockResolvedValueOnce({ data: [], error: { code: 'PGRST116' } });

    await expect(ensureTablesExist(supabase)).rejects.toThrow('Failed to verify sessions table: Database error');
    expect(consoleLogSpy).toHaveBeenCalledWith('Sessions table status before migrations: Unable to confirm existence');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to verify sessions table existence:', 'Database error');
    expect(consoleLogSpy).not.toHaveBeenCalledWith('All required tables ensured and verified.');
    expect(supabase.from).toHaveBeenCalledWith('sessions');
  });
});