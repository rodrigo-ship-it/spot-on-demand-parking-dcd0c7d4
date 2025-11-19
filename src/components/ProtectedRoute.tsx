import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireTermsAcceptance?: boolean;
}

export const ProtectedRoute = ({ children, requireTermsAcceptance = true }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
        return;
      }

      if (requireTermsAcceptance) {
        const termsAccepted = localStorage.getItem('termsAccepted');
        if (termsAccepted !== 'true') {
          navigate('/terms');
          return;
        }
      }
    }
  }, [user, loading, navigate, requireTermsAcceptance]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || (requireTermsAcceptance && localStorage.getItem('termsAccepted') !== 'true')) {
    return null;
  }

  return <>{children}</>;
};