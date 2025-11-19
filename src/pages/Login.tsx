import { Link } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';

const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          还没有账户？{' '}
          <Link to="/signup" className="text-primary hover:underline">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
