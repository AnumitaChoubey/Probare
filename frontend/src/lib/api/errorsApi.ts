export async function fetchErrorDetail(token: string, errorId: string) {
  const res = await fetch(`http://localhost:8000/errors/${errorId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!res.ok) {
    throw new Error('Failed to fetch error detail')
  }
  return res.json()
}

export async function fetchErrorHistory(token: string, errorId: string) {
  const res = await fetch(`http://localhost:8000/errors/${errorId}/history`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!res.ok) {
    throw new Error('Failed to fetch error history')
  }
  return res.json()
}

export async function fetchErrors(token: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) query.append(key, value)
  }
  const queryString = query.toString()
  const url = `http://localhost:8000/errors${queryString ? '?' + queryString : ''}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!res.ok) {
    throw new Error('Failed to fetch errors')
  }
  return res.json()
}

export async function createError(token: string, payload: any) {
  const res = await fetch(`http://localhost:8000/errors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    let msg = 'Failed to create error'
    if (Array.isArray(errorData.detail)) {
        msg = errorData.detail.map((d: any) => `${d.loc.join('.')}: ${d.msg}`).join(', ')
    } else if (typeof errorData.detail === 'string') {
        msg = errorData.detail
    }
    throw new Error(msg)
  }
  return res.json()
}
