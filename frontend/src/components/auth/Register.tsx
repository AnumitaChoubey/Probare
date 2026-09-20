import React from 'react';
import { AuthLayout } from './AuthLayout';
import { SignUp } from '@clerk/clerk-react';

export const Register: React.FC = () => {
  return (
    <AuthLayout
      title="Create an account"
      subtitle="Register to access the Quality Error Management System"
    >
      <div className="w-full">
        <SignUp 
          signInUrl="/login"
          appearance={{
            elements: {
              formButtonPrimary: 
                'bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold normal-case',
              card: 'shadow-none bg-transparent p-0 w-full max-w-full',
              header: 'hidden', 
              footer: 'bg-transparent border-none',
              footerActionText: '!text-slate-600 dark:!text-slate-400 font-medium',
              footerActionLink: 'text-indigo-600 hover:text-indigo-700 font-semibold',
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
