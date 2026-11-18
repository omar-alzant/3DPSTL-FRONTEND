import React from 'react';
import { Link } from 'react-router-dom';
import { BsCoin } from 'react-icons/bs';
import { useAuth } from '../context/AuthContext';
import { useCredits } from '../context/CreditsContext';

// رصيد الكريدت في الشريط العلوي — ظاهر في كل الصفحات، والضغط عليه يفتح صفحة الكريدت
export default function CreditBadge({ onClick }) {
  const { token } = useAuth();
  const { balance, isAdmin, change } = useCredits();
  if (!token) return null;

  return (
    <Link
      to="/credits"
      onClick={onClick}
      className={`credit-badge ${change > 0 ? 'up' : change < 0 ? 'down' : ''}`}
      title="رصيد الكريدت — اضغط للشحن ولملفاتك"
    >
      <BsCoin className="credit-badge-icon" />
      <span className="credit-badge-num">{isAdmin ? '∞' : balance === null ? '…' : balance.toLocaleString()}</span>
      {change !== 0 && (
        <span className="credit-badge-delta" dir="ltr">{change > 0 ? '+' : ''}{change.toLocaleString()}</span>
      )}
    </Link>
  );
}
