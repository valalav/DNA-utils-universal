import { NextRequest, NextResponse } from 'next/server'

// Получаем URL API из переменных окружения или используем значение по умолчанию
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:9003/api'

export async function GET(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/', '')
  
  try {
    console.log(`Проксируем запрос к: ${BACKEND_API_URL}/${path}`)
    
    // Добавляем таймаут для запроса
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 секунд таймаут
    
    const response = await fetch(`${BACKEND_API_URL}/${path}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`API вернул статус: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log(`Получен ответ от API`)
    return NextResponse.json(data)
  } catch (error) {
    console.error(`Ошибка при проксировании запроса к ${BACKEND_API_URL}/${path}:`, error)
    
    // Возвращаем детальную информацию об ошибке
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.name : typeof error,
        path,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/', '')
  
  try {
    console.log(`Проксируем POST запрос к: ${BACKEND_API_URL}/${path}`)
    
    // Добавляем таймаут для запроса
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 секунд таймаут
    
    const body = await request.json()
    
    const response = await fetch(`${BACKEND_API_URL}/${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`API вернул статус: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log(`Получен ответ от API`)
    return NextResponse.json(data)
  } catch (error) {
    console.error(`Ошибка при проксировании POST запроса к ${BACKEND_API_URL}/${path}:`, error)
    
    // Возвращаем детальную информацию об ошибке
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.name : typeof error,
        path,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}