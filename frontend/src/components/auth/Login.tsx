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
          signUpUrl="/register"
          appearance={{
            elements: {
              formButtonPrimary: 
                'bg-qems-brand hover:bg-qems-brand-dark text-sm font-semibold normal-case',
              card: 'shadow-none bg-transparent p-0 w-full max-w-full',
              header: 'hidden', // We use AuthLayout for header
              footer: 'bg-transparent border-none',
              footerActionText: '!text-qems-text-muted dark:!text-qems-text-disabled font-medium',
              footerActionLink: 'text-qems-brand-dark hover:text-qems-brand-dark font-semibold',
              formFieldInput: 'rounded-md border-slate-300 focus:border-qems-brand focus:ring-qems-brand text-qems-text-primary',
              formFieldLabel: 'text-sm font-medium text-qems-text-secondary ',
              socialButtonsBlockButton: 'border border-slate-300 hover:bg-qems-bg-surface text-qems-text-muted font-medium',
              dividerRow: 'my-6',
              dividerLine: 'bg-slate-200',
              dividerText: 'text-qems-text-muted text-xs'
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
