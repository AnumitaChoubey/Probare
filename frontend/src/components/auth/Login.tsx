import React from 'react';
import { AuthLayout } from './AuthLayout';
import { SignIn } from '@clerk/clerk-react';

export const Login: React.FC = () => {
  return (
    <AuthLayout
      title="Sign in to your account"
      subtitle="Access the Quality Error Management System"
    >
      <div className="w-full">
        <SignIn 
          routing="path" 
          path="/login" 
          signUpUrl="/register"
          appearance={{
            elements: {
              formButtonPrimary: 
                'bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold normal-case',
              card: 'shadow-none bg-transparent p-0 w-full max-w-full',
              header: 'hidden', // We use AuthLayout for header
              footer: 'hidden', // Custom styling often hides default footers or we can style it
              formFieldInput: 'rounded-md border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 text-slate-900',
              formFieldLabel: 'text-sm font-medium text-slate-700 dark:text-slate-300',
              socialButtonsBlockButton: 'border border-slate-300 hover:bg-slate-50 text-slate-600 font-medium',
              dividerRow: 'my-6',
              dividerLine: 'bg-slate-200',
              dividerText: 'text-slate-500 text-xs'
            },
            variables: {
              colorPrimary: '#4f46e5', // indigo-600
              colorBackground: 'transparent',
              colorText: '#0f172a', // slate-900
            }
          }}
        />
      </div>
    </AuthLayout>
  );
};
