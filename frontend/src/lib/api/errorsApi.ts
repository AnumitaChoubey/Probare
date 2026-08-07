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
