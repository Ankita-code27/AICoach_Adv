import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const VARIANTS = {
  error: { className: 'alert alert-error', Icon: AlertCircle, role: 'alert' },
  success: { className: 'alert alert-success', Icon: CheckCircle2, role: 'status' },
  info: { className: 'alert alert-info', Icon: Info, role: 'status' },
};

function Alert({ variant = 'error', children }) {
  if (!children) return null;
  const { className, Icon, role } = VARIANTS[variant] || VARIANTS.error;

  return (
    <p className={className} role={role}>
      <Icon size={16} />
      <span>{children}</span>
    </p>
  );
}

export default Alert;
