import { API_BASE_URL } from '..\config';

export async function fetchLobs(token: string) {
  const res = await fetch(`${API_BASE_URL}/categories/lobs`, {
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
    ? `${API_BASE_URL}/categories?lob_id=${lobId}`
    : `${API_BASE_URL}/categories`
    
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
