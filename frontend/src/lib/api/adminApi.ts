export async function fetchLobs(token: string) {
  const res = await fetch(`http://localhost:8000/categories/lobs`, {
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
    ? `http://localhost:8000/categories?lob_id=${lobId}`
    : `http://localhost:8000/categories`
    
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
