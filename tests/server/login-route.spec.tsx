// tests/server/login-route.spec.ts
import { render, fireEvent, waitFor } from '@testing-library/react';
import Login from '../../src/app/public/login/page';

// Mock Supabase client
jest.mock('../../src/supabase/browserClient', () => ({
  auth: {
    signInWithPassword: jest.fn().mockResolvedValue({ data: { session: { access_token: 'mock-token', expires_in: 3600 } }, error: null }),
    signUp: jest.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
  },
}));

describe('Login Page - Forgot Password', () => {
  it('should send a reset email and display success message', async () => {
    // Arrange
    const { getByText, getByLabelText, findByText } = render(<Login />);

    // Act: Switch to login mode, click forgot password, and submit
    fireEvent.click(getByText('Switch to Login')); // Ensure in login mode
    fireEvent.click(getByText('Forgot Password?'));
    fireEvent.change(getByLabelText('Email'), { target: { value: 'testuser@example.com' } });
    fireEvent.click(getByText('Send Reset Email'));

    // Assert
    const successMessage = await findByText('Password reset email sent! Please check your inbox.');
    expect(successMessage).toBeInTheDocument();
    expect(require('../../src/supabase/browserClient').auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'testuser@example.com',
      { redirectTo: expect.stringContaining('/public/reset-password') }
    );
  });
});