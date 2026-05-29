'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const C = {
  bg: 'linear-gradient(180deg, #fbe6c2 0%, #f5cf9a 55%, #e2a872 100%)',
  card: '#fbeac4',
  border: '#3a2014',
  text: '#3a2014',
  input: '#fff7e3',
  btn: '#f4c95a',
  btnDisabled: '#d6b985',
  muted: 'rgba(58,32,20,0.6)',
  error: '#3a2014',
  errorText: '#ffd2c2',
  success: '#5ac08a22',
  successBorder: '#5ac08a',
  successText: '#2a6a3a',
}

const inputStyle = {
  fontFamily: 'inherit',
  fontSize: 15,
  padding: '10px 12px',
  borderRadius: 10,
  border: `2px solid ${C.border}`,
  background: C.input,
  color: C.text,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'magic'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const reset = () => { setError(null); setSuccess(null); setStatus('idle') }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (status === 'loading') return
    setStatus('loading')
    setError(null)

    const supabase = createClient()

    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (err) { setError(err.message); setStatus('idle'); return }
      router.push('/lobby')
      router.refresh()
    } else {
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (err) { setError(err.message); setStatus('idle'); return }
      setSuccess('Conta criada! Verifique seu e-mail para confirmar e depois faça login.')
      setStatus('idle')
      setMode('login')
    }
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    if (status === 'loading') return
    setStatus('loading')
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (err) { setError(err.message); setStatus('idle'); return }
    setSuccess('Link enviado! Confira seu e-mail.')
    setStatus('idle')
  }

  return (
    <div
      style={{
        width: '100vw', height: '100vh',
        display: 'grid', placeItems: 'center',
        background: C.bg, color: C.text,
      }}
    >
      <div
        style={{
          background: C.card,
          border: `4px solid ${C.border}`,
          borderRadius: 18,
          padding: '28px 32px',
          width: 'min(400px, 92vw)',
          boxShadow: '0 18px 0 -8px #b73a2b, 0 24px 30px rgba(58,34,24,0.2)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: -0.5, textAlign: 'center' }}>
          MyPlaza
        </h1>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.7, textAlign: 'center' }}>
          Escritório social virtual
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', borderRadius: 10, border: `2px solid ${C.border}`, overflow: 'hidden' }}>
          {[['login', 'Entrar'], ['signup', 'Criar conta']].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setMode(key); reset() }}
              style={{
                flex: 1, padding: '9px 0',
                fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
                border: 'none', cursor: 'pointer',
                background: mode === key ? C.border : 'transparent',
                color: mode === key ? '#fbe6c2' : C.text,
                transition: 'background 120ms',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {success && (
          <div style={{ background: C.success, border: `2px solid ${C.successBorder}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, color: C.successText }}>
            {success}
          </div>
        )}

        {mode !== 'magic' ? (
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                autoFocus
                required
                style={inputStyle}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>Senha</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : '••••••••'}
                required
                minLength={6}
                style={inputStyle}
              />
            </label>

            {error && (
              <div style={{ background: C.error, color: C.errorText, borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                fontFamily: 'inherit', fontWeight: 700, fontSize: 16,
                padding: '13px 18px', borderRadius: 12, border: `3px solid ${C.border}`,
                background: status === 'loading' ? C.btnDisabled : C.btn,
                color: C.text,
                cursor: status === 'loading' ? 'wait' : 'pointer',
                boxShadow: `0 5px 0 ${C.border}`,
                transform: status === 'loading' ? 'translateY(2px)' : 'none',
                transition: 'transform 120ms, background 120ms',
              }}
            >
              {status === 'loading'
                ? (mode === 'login' ? 'Entrando…' : 'Criando conta…')
                : (mode === 'login' ? 'Entrar' : 'Criar conta')}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => { setMode('magic'); reset() }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: C.muted, textDecoration: 'underline',
                  fontFamily: 'inherit',
                }}
              >
                Entrar com link mágico (e-mail)
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                autoFocus
                required
                style={inputStyle}
              />
            </label>

            {error && (
              <div style={{ background: C.error, color: C.errorText, borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                fontFamily: 'inherit', fontWeight: 700, fontSize: 16,
                padding: '13px 18px', borderRadius: 12, border: `3px solid ${C.border}`,
                background: status === 'loading' ? C.btnDisabled : C.btn,
                color: C.text,
                cursor: status === 'loading' ? 'wait' : 'pointer',
                boxShadow: `0 5px 0 ${C.border}`,
                transform: status === 'loading' ? 'translateY(2px)' : 'none',
              }}
            >
              {status === 'loading' ? 'Enviando…' : 'Enviar link'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => { setMode('login'); reset() }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: C.muted, textDecoration: 'underline',
                  fontFamily: 'inherit',
                }}
              >
                ← Voltar para senha
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
