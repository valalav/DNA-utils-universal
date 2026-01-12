import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://192.168.10.170:9005'

export async function middleware(request: NextRequest) {
  // Обрабатываем только запросы к /api/*
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const path = request.nextUrl.pathname // оставляем /api/admin/keys как есть

    // Извлекаем ключ из query параметров (пробуем разные имена)
    const apiKeyFromQuery = request.nextUrl.searchParams.get('_t') || // token
      request.nextUrl.searchParams.get('key')

    // Удаляем ключ из параметров для бэкенда (чтобы не светить в логах)
    const searchParams = new URLSearchParams(request.nextUrl.searchParams)
    searchParams.delete('_t')
    searchParams.delete('key')
    const searchString = searchParams.toString()

    const fullPath = searchString ? `${path}?${searchString}` : path
    const backendUrl = `${BACKEND_URL}${fullPath}` // без слэша, т.к. path уже начинается с /

    try {
      // Копируем заголовки
      const headers = new Headers()
      request.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase()
        if (lowerKey !== 'host' && lowerKey !== 'connection') {
          headers.set(key, value)
        }
      })

      // Определяем API ключ в порядке приоритета
      // ПРИОРИТЕТ 1: API ключ из query параметра
      if (apiKeyFromQuery) {
        headers.set('X-API-Key', apiKeyFromQuery)
      }
      // ПРИОРИТЕТ 2: X-API-Key заголовок уже есть (скопирован выше)
      else if (headers.has('X-API-Key')) {
        // Ничего не делаем, ключ уже скопирован
      }
      // ПРИОРИТЕТ 3: Authorization заголовок
      else if (headers.has('Authorization')) {
        const auth = headers.get('Authorization')
        if (auth?.startsWith('Bearer ')) {
          headers.set('X-API-Key', auth.substring(7))
        }
      }
      // ПРИОРИТЕТ 4: Cookie
      else {
        const cookieHeader = request.headers.get('cookie')
        if (cookieHeader) {
          const cookies = cookieHeader.split(';').map(c => c.trim())
          const apiKeyCookie = cookies.find(c => c.startsWith('api_key='))
          if (apiKeyCookie) {
            const apiKey = apiKeyCookie.substring(8) // убираем "api_key="
            headers.set('X-API-Key', decodeURIComponent(apiKey))
          }
        }
      }

      // Копируем body если есть
      let body = undefined
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        body = await request.text()
      }

      const response = await fetch(backendUrl, {
        method: request.method,
        headers,
        body: body || undefined,
      })

      const data = await response.text()

      return new NextResponse(data, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      return NextResponse.json(
        { error: 'Proxy error', message: error instanceof Error ? error.message : 'Unknown' },
        { status: 500 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
