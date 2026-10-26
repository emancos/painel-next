import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { db } from './db'
import { users, locations } from './db/schema'
import { eq } from 'drizzle-orm'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super_secret_jwt_chamados_2026_key')
const COOKIE_NAME = 'chamados_session'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: string
  avatarUrl?: string | null
}

/**
 * Cria token JWT e grava no cookie HTTP-only da sessão.
 */
export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl || null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(JWT_SECRET)

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 horas
    path: '/',
  })

  return token
}

/**
 * Atualiza os dados da sessão mantendo o cookie sincronizado.
 */
export async function updateUserSession(updatedData: Partial<SessionUser>) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return null

  const newSessionUser: SessionUser = {
    ...currentUser,
    ...updatedData,
  }
  await createSession(newSessionUser)
  return newSessionUser
}

/**
 * Obtém o usuário atualmente autenticado a partir dos cookies.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      id: payload.id as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as string,
      avatarUrl: (payload.avatarUrl as string) || null,
    }
  } catch {
    return null
  }
}

/**
 * Realiza login com e-mail e senha.
 */
export async function authenticateUser(email: string, password: string): Promise<
  { success: true; user: SessionUser } | { success: false; message: string }
> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1)

  if (!user || !user.active) {
    return { success: false, message: 'Usuário não encontrado ou inativo.' }
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash)
  if (!isValidPassword) {
    return { success: false, message: 'Senha incorreta.' }
  }

  const sessionUser: SessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl || null,
  }

  await createSession(sessionUser)

  return { success: true, user: sessionUser }
}

/**
 * Finaliza a sessão do usuário.
 */
export async function logoutUser() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  return { success: true }
}

/**
 * Vincula o usuário/atendente a uma mesa ou guichê.
 */
export async function bindUserToLocation(userId: string, locationId: string) {
  // Desvincula o usuário de qualquer outro guichê primeiro
  await db
    .update(locations)
    .set({ currentUserId: null })
    .where(eq(locations.currentUserId, userId))

  // Vincula ao novo guichê
  const [updated] = await db
    .update(locations)
    .set({ currentUserId: userId })
    .where(eq(locations.id, locationId))
    .returning()

  return updated
}
