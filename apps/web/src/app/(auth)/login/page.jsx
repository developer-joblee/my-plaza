'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Button, Field, Flex, Heading, Input, Stack, Text, InputGroup, IconButton } from '@chakra-ui/react'
import { createClient } from '@/lib/supabase/client'
import { LucideEye, LucideEyeOff } from 'lucide-react'

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

const inputProps = {
  fontFamily: 'inherit',
  fontSize: '15px',
  px: '12px',
  py: '10px',
  height: 'auto',
  borderRadius: '10px',
  border: `2px solid ${C.border}`,
  background: C.input,
  color: C.text,
  width: '100%',
  _focus: { outline: 'none', boxShadow: 'none', borderColor: C.border },
  _focusVisible: { outline: 'none', boxShadow: 'none', borderColor: C.border },
  _placeholder: { color: C.muted },
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'magic'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

  const submitButtonProps = {
    type: 'submit',
    disabled: status === 'loading',
    fontFamily: 'inherit',
    fontWeight: 700,
    fontSize: '16px',
    px: '18px',
    py: '13px',
    height: 'auto',
    borderRadius: '12px',
    border: `3px solid ${C.border}`,
    background: status === 'loading' ? C.btnDisabled : C.btn,
    color: C.text,
    cursor: status === 'loading' ? 'wait' : 'pointer',
    boxShadow: `0 5px 0 ${C.border}`,
    transform: status === 'loading' ? 'translateY(2px)' : 'none',
    transition: 'transform 120ms, background 120ms',
    _hover: { background: status === 'loading' ? C.btnDisabled : C.btn },
    _active: { background: status === 'loading' ? C.btnDisabled : C.btn },
  }

  const linkButtonProps = {
    type: 'button',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    color: C.muted,
    textDecoration: 'underline',
    fontFamily: 'inherit',
    height: 'auto',
    padding: 0,
    _hover: { background: 'none' },
    _active: { background: 'none' },
  }

  return (
    <Box
      width="100vw"
      height="100vh"
      display="grid"
      placeItems="center"
      background={C.bg}
      color={C.text}
    >
      <Stack
        background={C.card}
        border={`4px solid ${C.border}`}
        borderRadius="18px"
        px="32px"
        py="28px"
        width="min(400px, 92vw)"
        boxShadow="0 18px 0 -8px #b73a2b, 0 24px 30px rgba(58,34,24,0.2)"
        gap="16px"
      >
        <Heading as="h1" margin={0} fontSize="28px" letterSpacing="-0.5px" textAlign="center" fontWeight={700}>
          MyPlaza
        </Heading>
        <Text margin={0} fontSize="13px" opacity={0.7} textAlign="center">
          Escritório social virtual
        </Text>

        {/* Tabs */}
        <Flex borderRadius="10px" border={`2px solid ${C.border}`} overflow="hidden">
          {[['login', 'Entrar'], ['signup', 'Criar conta']].map(([key, label]) => (
            <Button
              key={key}
              type="button"
              onClick={() => { setMode(key); reset() }}
              flex="1"
              px={0}
              py="9px"
              height="auto"
              borderRadius={0}
              fontFamily="inherit"
              fontWeight={700}
              fontSize="13px"
              border="none"
              cursor="pointer"
              background={mode === key ? C.border : 'transparent'}
              color={mode === key ? '#fbe6c2' : C.text}
              transition="background 120ms"
              _hover={{ background: mode === key ? C.border : 'transparent' }}
              _active={{ background: mode === key ? C.border : 'transparent' }}
            >
              {label}
            </Button>
          ))}
        </Flex>

        {success && (
          <Box
            background={C.success}
            border={`2px solid ${C.successBorder}`}
            borderRadius="10px"
            px="12px"
            py="10px"
            fontSize="13px"
            color={C.successText}
          >
            {success}
          </Box>
        )}

        {mode !== 'magic' ? (
          <Stack as="form" onSubmit={handlePasswordSubmit} gap="12px">
            <Field.Root>
              <Field.Label fontSize="13px" fontWeight={600} color={C.text} mb="5px">E-mail</Field.Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                autoFocus
                required
                {...inputProps}
              />
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize="13px" fontWeight={600} color={C.text} mb="5px">Senha</Field.Label>
             <InputGroup endElement={<IconButton size="sm" variant="plain" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <LucideEyeOff /> : <LucideEye />}</IconButton>}>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : '••••••••'}
                  required
                  minLength={6}
                  {...inputProps}
                />
              </InputGroup>
            </Field.Root>

            {error && (
              <Box
                background={C.error}
                color={C.errorText}
                borderRadius="10px"
                px="12px"
                py="10px"
                fontSize="13px"
              >
                {error}
              </Box>
            )}

            <Button {...submitButtonProps}>
              {status === 'loading'
                ? (mode === 'login' ? 'Entrando…' : 'Criando conta…')
                : (mode === 'login' ? 'Entrar' : 'Criar conta')}
            </Button>

            <Box textAlign="center">
              <Button
                {...linkButtonProps}
                onClick={() => { setMode('magic'); reset() }}
              >
                Entrar com link mágico (e-mail)
              </Button>
            </Box>
          </Stack>
        ) : (
          <Stack as="form" onSubmit={handleMagicLink} gap="12px">
            <Field.Root>
              <Field.Label fontSize="13px" fontWeight={600} color={C.text} mb="5px">E-mail</Field.Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                autoFocus
                required
                {...inputProps}
              />
            </Field.Root>

            {error && (
              <Box
                background={C.error}
                color={C.errorText}
                borderRadius="10px"
                px="12px"
                py="10px"
                fontSize="13px"
              >
                {error}
              </Box>
            )}

            <Button {...submitButtonProps}>
              {status === 'loading' ? 'Enviando…' : 'Enviar link'}
            </Button>

            <Box textAlign="center">
              <Button
                {...linkButtonProps}
                onClick={() => { setMode('login'); reset() }}
              >
                ← Voltar para senha
              </Button>
            </Box>
          </Stack>
        )}
      </Stack>
    </Box>
  )
}
