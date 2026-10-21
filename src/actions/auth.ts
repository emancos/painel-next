'use server'

import { authenticateUser, logoutUser, getCurrentUser, SessionUser } from '@/lib/auth'

export async function loginAction(formData: FormData): Promise<
  { success: true; user: SessionUser } | { success: false; message: string }
> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { success: false, message: 'Preencha o e-mail e a senha.' }
  }

  return authenticateUser(email, password)
}

export async function logoutAction() {
  return logoutUser()
}

export async function getSessionAction() {
  return getCurrentUser()
}
