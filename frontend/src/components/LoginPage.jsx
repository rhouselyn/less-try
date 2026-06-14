import { useState } from 'react';
import { auth } from '../utils/auth';

export default function LoginPage({ t, onDone }) {
  const [reg, setReg] = useState(false);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      if (reg) await auth.register(email, pw, name); else await auth.login(email, pw);
      onDone?.();
    } catch (e) { setErr(e.response?.data?.detail || '操作失败') }
    finally { setLoading(false) }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment-50 px-4">
      <div className="w-full max-w-sm bg-parchment-50 border-2 border-aged-200 rounded-sm p-6 shadow-retro">
        <h2 className="text-xl font-serif text-ink-800 text-center mb-4">
          {reg ? (t?.register || '注册') : (t?.login || '登录')}
        </h2>
        {err && <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-sm">{err}</div>}
        <form onSubmit={submit} className="space-y-3">
          {reg && <input type="text" placeholder={t?.name || '昵称'} value={name} onChange={e=>setName(e.target.value)}
            className="w-full px-3 py-2 border border-aged-200 rounded-sm bg-white focus:outline-none focus:border-amber-500" />}
          <input type="email" placeholder={t?.email || '邮箱'} value={email} onChange={e=>setEmail(e.target.value)} required
            className="w-full px-3 py-2 border border-aged-200 rounded-sm bg-white focus:outline-none focus:border-amber-500" />
          <input type="password" placeholder={t?.password || '密码'} value={pw} onChange={e=>setPw(e.target.value)} required minLength={6}
            className="w-full px-3 py-2 border border-aged-200 rounded-sm bg-white focus:outline-none focus:border-amber-500" />
          <button type="submit" disabled={loading}
            className="w-full py-2 bg-amber-500 text-white rounded-sm hover:bg-amber-600 disabled:opacity-50">
            {loading ? '...' : (reg ? (t?.register || '注册') : (t?.login || '登录'))}
          </button>
        </form>
        <p className="mt-3 text-center text-sm text-ink-500">
          {reg ? (t?.hasAccount || '已有账号？') : (t?.noAccount || '没有账号？')}
          <button onClick={() => { setReg(!reg); setErr('') }} className="text-amber-600 ml-1">
            {reg ? (t?.login || '登录') : (t?.register || '注册')}
          </button>
        </p>
        <div className="mt-4 pt-3 border-t border-aged-200 text-center">
          <button onClick={() => onDone?.()} className="text-xs text-ink-400 hover:text-ink-600">
            {t?.skipLogin || '跳过，直接使用自己的 API Key'}
          </button>
        </div>
      </div>
    </div>
  );
}
