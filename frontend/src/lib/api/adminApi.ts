export async function fetchLobs(token: string) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/categories/lobs`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!res.ok) {
    throw new Error('Failed to fetch LOBs')
  }
  return res.json()
}

export async function fetchCategories(token: string, lobId?: string) {
  const url = lobId 
    ? `${import.meta.env.VITE_API_URL}/categories?lob_id=${lobId}`
    : `${import.meta.env.VITE_API_URL}/categories`
    
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!res.ok) {
    throw new Error('Failed to fetch categories')
  }
  return res.json()
}
