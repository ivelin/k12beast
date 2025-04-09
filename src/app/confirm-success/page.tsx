// src/app/confirm-success/page.tsx
export default function ConfirmSuccess() {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-card p-6 rounded-lg shadow-sm w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-foreground">Email Confirmed!</h1>
          <p className="text-muted-foreground mb-6">
            Your email has been successfully confirmed. You can now log in to K12Beast.
          </p>
          <a href="/login" className="text-primary hover:underline">
            Go to Login
          </a>
        </div>
      </div>
    );
  }