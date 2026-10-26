import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)
const COOKIE_NAME = 'chamados_session'

interface TokenPayload {
  id: string
  name: string
  email: string
  role: string
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(COOKIE_NAME)?.value

  let user: TokenPayload | null = null

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      user = {
        id: payload.id as string,
        name: payload.name as string,
        email: payload.email as string,
        role: payload.role as string,
      }
    } catch {
      user = null
    }
  }

  // 1. ROTA /triagem: Apenas usuários autenticados têm acesso
  if (pathname.startsWith('/triagem')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    // Usuário autenticado tem acesso
    return NextResponse.next()
  }

  // 2. REGRA DO OPERADOR DE TRIAGEM (TRIAGE):
  // Só pode acessar /triagem e /painel/... (Painel de Chamados / TV)
  if (user && user.role === 'TRIAGE') {
    // Bloquear acesso a /atendimento, /admin e à raiz /
    if (
      pathname.startsWith('/atendimento') ||
      pathname.startsWith('/admin') ||
      pathname === '/'
    ) {
      return NextResponse.redirect(new URL('/triagem', request.url))
    }
  }

  // 3. ROTA /atendimento: Requer autenticação e bloqueia perfil TRIAGE
  if (pathname.startsWith('/atendimento')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    if (user.role === 'TRIAGE') {
      return NextResponse.redirect(new URL('/triagem', request.url))
    }
    return NextResponse.next()
  }

  // 4. ROTA /admin: Requer autenticação e perfil exclusivo ADMIN
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    if (user.role !== 'ADMIN') {
      if (user.role === 'TRIAGE') {
        return NextResponse.redirect(new URL('/triagem', request.url))
      }
      return NextResponse.redirect(new URL('/atendimento', request.url))
    }
    return NextResponse.next()
  }

  // 5. ROTA /perfil: Acessível por qualquer usuário autenticado (ADMIN, ATTENDANT, TRIAGE)
  if (pathname.startsWith('/perfil')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware nas rotas relevantes, ignorando arquivos estáticos,
     * imagens, favicon e endpoints de API internos.
     */
    '/triagem/:path*',
    '/atendimento/:path*',
    '/admin/:path*',
    '/perfil/:path*',
    '/',
  ],
}
